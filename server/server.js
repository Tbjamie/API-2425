import "dotenv/config";
import { App } from "@tinyhttp/app";
import { logger } from "@tinyhttp/logger";
import { Liquid } from "liquidjs";
import sirv from "sirv";
import bcrypt from "bcrypt";
import { MongoClient, ObjectId } from "mongodb";
import * as parser from "milliparsec";
import nextSession from "next-session";

const client = new MongoClient(process.env.MONGO_URI);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}

connectToDatabase();

const db = client.db("Omni");
const chatsCollection = db.collection("chats");
const groupsCollection = db.collection("groups");
const messagesCollection = db.collection("messages");
const usersCollection = db.collection("users");

const engine = new Liquid({
  extname: ".liquid",
});

const app = new App();

const getSession = nextSession({
  cookie: {
    httpOnly: true,
    // secure: true,
    sameSite: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
});

app
  .use(logger())
  .use(parser.urlencoded({ extended: true }))
  .use("/", sirv("dist"))
  .use("/static", sirv("static"))
  .use(async (req, res, next) => {
    await getSession(req, res);
    next();
  })
  .listen(3000, () => console.log("Server available on http://localhost:3000"));

app.post("/api/status", async (req, res) => {
  // Try to extract the status from the strange format
  let status = "offline";

  // Handle the strange format where the key is a stringified JSON
  const keys = Object.keys(req.body);
  if (keys.length > 0) {
    try {
      // Try to parse the key as JSON
      const jsonKey = JSON.parse(keys[0]);
      if (jsonKey && jsonKey.status) {
        status = jsonKey.status;
      }
    } catch (e) {
      console.error("Failed to parse status from request body:", e);
    }
  }

  if (req.session.user) {
    await usersCollection.updateOne(
      { _id: new ObjectId(req.session.user) },
      {
        $set: {
          status: status,
          lastSeen: new Date(),
        },
      }
    );

    // Send successful response
    res.status(200).json({ message: "Status updated successfully" });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

// SSE endpoint for status updates
app.get("/api/status/stream", async (req, res) => {
  if (!req.session.visited) {
    return res.status(401).send("Unauthorized");
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send initial heartbeat
  res.write("event: connected\ndata: Connected to status stream\n\n");

  // Set up MongoDB change stream to watch for user status changes
  const changeStream = usersCollection.watch([
    { $match: { "updateDescription.updatedFields.status": { $exists: true } } },
  ]);

  changeStream.on("change", async (change) => {
    if (
      change.operationType === "update" &&
      change.updateDescription.updatedFields.status
    ) {
      const userId = change.documentKey._id;
      const user = await usersCollection.findOne(
        { _id: userId },
        { projection: { username: 1, name: 1, status: 1, _id: 1 } }
      );

      const payload = JSON.stringify({
        userId: userId.toString(),
        username: user.username,
        name: user.name,
        status: user.status,
      });

      res.write(`event: statusUpdate\ndata: ${payload}\n\n`);
    }
  });

  // Handle client disconnection
  req.on("close", () => {
    console.log("Client disconnected from status stream");
    changeStream.close();
  });
});

app.get("/", async (req, res) => {
  if (req.session.visited) {
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.session.user),
    });

    const allUsers = await usersCollection
      .find(
        { _id: { $ne: new ObjectId(req.session.user) } },
        { projection: { name: 1, _id: 1 } }
      )
      .toArray();

    const chats = await chatsCollection
      .find({ members: { $in: [new ObjectId(req.session.user)] } })
      .toArray();

    for (const chat of chats) {
      for (const member of chat.members) {
        if (member.toString() !== req.session.user) {
          const otherUser = await usersCollection.findOne(
            { _id: member },
            { projection: { name: 1, profilePic: 1 } }
          );
          chat.otherUser = otherUser;
        }
      }

      const lastMessage = await messagesCollection.findOne({
        _id: chat.lastMessage,
      });

      chat.lastMessage = lastMessage;
    }

    return res.send(
      renderTemplate("server/views/index.liquid", {
        user: user,
        chats: chats,
        users: allUsers,
      })
    );
  } else {
    res.redirect("/login");
  }
});

app.get("/chat", async (req, res) => {
  if (req.session.visited) {
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

app.get("/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let changeStream;

  changeStream = messagesCollection.watch();

  changeStream.on("change", (change) => {
    const payload = JSON.stringify(change.fullDocument || change);
    res.write(`data: ${payload}\n\n`);
  });

  req.on("close", () => {
    console.log("Client disconnected");
    changeStream.close();
  });
});

app.get("/chat/:id", async (req, res) => {
  if (req.session.visited) {
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.session.user),
    });

    const allUsers = await usersCollection
      .find(
        { _id: { $ne: new ObjectId(req.session.user) } },
        { projection: { name: 1, _id: 1 } }
      )
      .toArray();

    const currentChat = await chatsCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    const messages = await messagesCollection
      .find({ chatId: currentChat._id })
      .toArray();

    const chats = await chatsCollection
      .find({ members: { $in: [new ObjectId(req.session.user)] } })
      .toArray();

    for (const chat of chats) {
      for (const member of chat.members) {
        if (member.toString() !== req.session.user) {
          const otherUser = await usersCollection.findOne(
            { _id: member },
            { projection: { name: 1, profilePic: 1 } }
          );
          chat.otherUser = otherUser;
        }
      }

      const lastMessage = await messagesCollection.findOne({
        _id: chat.lastMessage,
      });

      chat.lastMessage = lastMessage;

      for (const member of currentChat.members) {
        if (member.toString() !== req.session.user) {
          const otherMember = await usersCollection.findOne(
            { _id: member },
            {
              projection: {
                name: 1,
                profilePic: 1,
                lastSeen: 1,
                status: 1,
                username: 1,
              },
            }
          );
          currentChat.otherMember = otherMember;
        }
      }

      // Sort chats by last message timestamp (newest first)
      chats.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp
          ? new Date(a.lastMessage.timestamp)
          : new Date(0);
        const timeB = b.lastMessage?.timestamp
          ? new Date(b.lastMessage.timestamp)
          : new Date(0);
        return timeB - timeA;
      });

      messages.forEach((message) => {
        message.senderId = message.senderId.toString();
      });

      user._id = user._id.toString();
    }

    return res.send(
      renderTemplate("server/views/chat.liquid", {
        user: user,
        messages: messages,
        currentChat: currentChat,
        chats: chats,
        users: allUsers,
      })
    );
  } else {
    res.redirect("/login");
  }
});

app.post("/chat/:id", async (req, res) => {
  const text = req.body["chat-input"];

  if (text === "" || text === undefined || text === null) {
    return;
  }

  await messagesCollection
    .insertOne({
      chatId: new ObjectId(req.params.id),
      senderId: new ObjectId(req.session.user),
      text: text,
      media: null,
      timestamp: new Date(),
      status: "sent",
    })
    .then(async () => {
      const lastMessage = await messagesCollection.findOne(
        { chatId: new ObjectId(req.params.id) },
        { sort: { timestamp: -1 }, limit: 1 }
      );

      console.log("LAST MESSAGE:", lastMessage);

      await chatsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            lastMessage: lastMessage._id,
          },
        }
      );
    });

  return res.status(200);
});

app.post("/create", async (req, res) => {
  const data = req.body;
  const members = data.members;

  console.log("MEMBERS", members);

  if (members.length < 1) {
    return res.status(400).send("You need at least 1 member to create a chat.");
  }

  const chat = await chatsCollection
    .insertOne({
      isGroup: false,
      createdAt: new Date(),
      lastMessage: null,
      members: [
        new ObjectId(req.session.user),
        new ObjectId(members.toString()),
      ],
    })
    .then(() => {
      res.redirect(`/`);
    });
});

app.get("/profile/:username", async (req, res) => {
  if (req.session.visited) {
    const username = req.params.username;
    const user = await usersCollection.findOne(
      { username: username },
      {
        projection: {
          name: 1,
          username: 1,
          profilePic: 1,
          status: 1,
          lastSeen: 1,
          bio: 1,
        },
      }
    );

    res.send(renderTemplate("server/views/profile.liquid", { user: user }));
  } else {
    res.redirect("/login");
  }
});

app.get("/register", async (req, res) => {
  if (req.session.visited) {
    res.redirect("/");
  } else {
    return res.send(renderTemplate("server/views/register.liquid"));
  }
});

app.post("/register", async (req, res) => {
  const { username, name, email, password } = req.body;

  let validPassword;

  if (
    !password.includes(name.toLowerCase()) &&
    !password.includes(name.toUpperCase()) &&
    password.length >= 8 &&
    /[A-Z]/.test(password)
  ) {
    validPassword = true;
  } else {
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await usersCollection.findOne({
    username: req.body.username.toLowerCase(),
  });
  const existingEmail = await usersCollection.findOne({
    email: req.body.email.toLowerCase(),
  });

  if (existingUser) {
    return res.status(404).send(
      renderTemplate("server/views/register.liquid", {
        usernameError:
          "This username is already taken. Please choose a different one.",
      })
    );
  } else if (existingEmail) {
    return res.status(404).send(
      renderTemplate("server/views/register.liquid", {
        emailError:
          "An account with this email already exists. Please use a different email address.",
      })
    );
  } else if (req.body.username && /[^a-zA-Z0-9]/.test(req.body.username)) {
    return res.status(404).send(
      renderTemplate("server/views/register.liquid", {
        usernameInvalid:
          "The username can only contain letters and numbers. Please choose a valid username.",
      })
    );
  } else {
    await usersCollection
      .insertOne({
        username: username.toLowerCase(),
        name: name,
        email: email.toLowerCase(),
        password: hashedPassword,
        profilePic: "",
        status: "",
        lastSeen: new Date(),
        bio: "Hey there! I am using Omni.",
      })
      .then(() => {
        res.redirect("/login");
      });
  }
});

app.get("/login", async (req, res) => {
  if (req.session.visited) {
    res.redirect("/");
  } else {
    res.send(renderTemplate("server/views/login.liquid"));
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await usersCollection.findOne({
    username: username.toLowerCase(),
  });

  if (!user) {
    return res.status(404).send(
      renderTemplate("server/views/login.liquid", {
        error:
          "The username and password you entered did not match our records. Please double-check and try again.",
      })
    );
  }

  const comparedPassword = await bcrypt.compare(password, user.password);

  if (!comparedPassword) {
    return res.status(404).send(
      renderTemplate("server/views/login.liquid", {
        error:
          "The username and password you entered did not match our records. Please double-check and try again.",
      })
    );
  }

  if (user && comparedPassword) {
    req.session.visited = true;
    req.session.user = user._id.toString();

    res.redirect("/");
  }
});

app.get("/logout", async (req, res) => {
  req.session.destroy().then((err) => {
    res.redirect("/login");

    if (err) {
      console.log("Error destroying session", err);
    }
  });
});

const renderTemplate = (template, data) => {
  const templateData = {
    NODE_ENV: process.env.NODE_ENV || "production",
    ...data,
  };

  return engine.renderFileSync(template, templateData);
};

app.use((req, res) => {
  res.status(404).send(renderTemplate("server/views/404.liquid"));
});

app.use((req, res) => {
  res.status(500).send(renderTemplate("server/views/500.liquid"));
});
