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
  .use(async (req, res, next) => {
    await getSession(req, res);
    next();
  })
  .listen(3000, () => console.log("Server available on http://localhost:3000"));

app.get("/", async (req, res) => {
  if (req.session.visited) {
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.session.user),
    });

    return res.send(
      renderTemplate("server/views/index.liquid", {
        user: user,
      })
    );
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
    console.log("User already exists");
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
    console.log("User created");
    await usersCollection
      .insertOne({
        username: username.toLowerCase(),
        name: name,
        email: email.toLowerCase(),
        password: hashedPassword,
        profilePic: "",
        status: "",
        lastSeen: new Date(),
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
    console.log("User logged in", user._id.toString());

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
