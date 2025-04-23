import "./index.css";
const createChatButton = document.querySelector(".create-chat");
const createChatModal = document.querySelector(".create-chat-modal");
const createChatSubmitButton = document.querySelector(".create-chat-submit");
const closeChatModalButton = document.querySelector(".close-modal-button");

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    fetch("/api/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "offline" }),
    })
      .then((response) => response.json())
      .then((data) => console.log("Status updated:", data))
      .catch((err) => console.error("Error updating status:", err));
  } else if (!document.hidden) {
    fetch("/api/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "online" }),
    })
      .then((response) => response.json())
      .then((data) => console.log("Status updated:", data))
      .catch((err) => console.error("Error updating status:", err));
  } else {
    if (window.innerWidth > 1024) {
      let lastMouseMoveTime = Date.now();

      const inactivityInterval = setInterval(() => {
        if (Date.now() - lastMouseMoveTime > 60000) {
          fetch("/api/status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "away" }),
          })
            .then((response) => response.json())
            .then((data) => console.log("Status updated:", data))
            .catch((err) => console.error("Error updating status:", err));
        }
      }, 10000);

      document.addEventListener("mousemove", () => {
        lastMouseMoveTime = Date.now();
      });
    }
  }
});

// Connect to the status stream
function connectToStatusStream() {
  const statusEventSource = new EventSource("/api/status/stream");

  // Handle connection established
  statusEventSource.addEventListener("connected", (event) => {
    console.log("Status stream connected:", event.data);
  });

  // Handle status updates
  statusEventSource.addEventListener("statusUpdate", (event) => {
    const statusData = JSON.parse(event.data);
    console.log("Status update received:", statusData);

    // Update the UI based on the status change
    updateUserStatusInUI(statusData);
  });

  // Error handling
  statusEventSource.onerror = (error) => {
    console.error("Status stream error:", error);
    statusEventSource.close();

    // Reconnect after a delay
    setTimeout(connectToStatusStream, 5000);
  };

  return statusEventSource;
}

// Update UI when a user's status changes
function updateUserStatusInUI(userData) {
  // Find all elements that show this user's status
  const userStatusElement = document.querySelector(`.other-status`);

  userStatusElement.textContent = userData.status;

  // You could also update styling based on status
  // Remove all status-related classes
  element.classList.remove("status-online", "status-away", "status-busy");

  // Add appropriate class based on status
  if (userData.status === "online") {
    element.classList.add("status-online");
  } else if (userData.status === "away") {
    element.classList.add("status-away");
  } else if (userData.status === "busy") {
    element.classList.add("status-busy");
  }
}

// Start the connection when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const statusStream = connectToStatusStream();

  // Optionally store the stream in window to access it later
  window.statusStream = statusStream;
});

if (closeChatModalButton) {
  closeChatModalButton.addEventListener("click", () => {
    createChatModal.style.display = "none";
  });
}

if (createChatSubmitButton) {
  createChatSubmitButton.addEventListener("click", () => {
    createChatModal.style.display = "none";
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    createChatModal.style.display = "none";
  }
});

if (createChatButton) {
  createChatButton.addEventListener("click", () => {
    createChatModal.style.display = "flex";
  });
}

document.addEventListener("navigate", (event) => {
  if (!document.startViewTransition) {
    return;
  }

  document.startViewTransition(() => {
    window.location.href = event.detail.url;
  });
});

const backButton = document.querySelector(".back-button");

console.log(backButton);

if (backButton) {
  backButton.addEventListener("click", () => {
    // document.documentElement.classList.add("popstate-back");
    // setTimeout(() => {
    window.history.back();
    // }, 100);
  });
}

window.addEventListener("popstate", async (event) => {
  console.log(event);
});

// window.addEventListener("pagereveal", (event) => {
//   console.log("REVEEEEAAAL");
// });

window.addEventListener("DOMContentLoaded", () => {
  if (location.pathname === "/register") {
    const passwordInput = document.querySelector("#password");
    const authMinChars = document.querySelector(".auth-min-chars");
    const authUppercase = document.querySelector(".auth-uppercase");
    const authNotOwnName = document.querySelector(".auth-not-own-name");
    const validIcon = document.querySelectorAll(".valid-icon");
    const inputFields = document.querySelectorAll("input");
    const name = document.querySelector("#name").value;
    const password = passwordInput.value;
    const submitButton = document.querySelector(".submit-button");

    const nameRegex = new RegExp(`\\b${name}\\b`, "i");

    setInterval(() => {
      validIcon.forEach((icon) => {
        if (!icon.parentElement.classList.contains("valid")) {
          icon.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.6449 2.04935C12.1134 1.58082 12.1134 0.819928 11.6449 0.351398C11.1763 -0.117133 10.4154 -0.117133 9.9469 0.351398L6 4.30205L2.04935 0.355146C1.58082 -0.113384 0.819928 -0.113384 0.351398 0.355146C-0.117133 0.823676 -0.117133 1.58457 0.351398 2.0531L4.30205 6L0.355146 9.95065C-0.113384 10.4192 -0.113384 11.1801 0.355146 11.6486C0.823676 12.1171 1.58457 12.1171 2.0531 11.6486L6 7.69795L9.95065 11.6449C10.4192 12.1134 11.1801 12.1134 11.6486 11.6449C12.1171 11.1763 12.1171 10.4154 11.6486 9.9469L7.69795 6L11.6449 2.04935Z" fill="currentColor"/>
</svg>
`;
        } else {
          icon.innerHTML = `<svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.6652 0.322215C16.1116 0.751836 16.1116 1.44954 15.6652 1.87916L6.52338 10.6778C6.077 11.1074 5.35208 11.1074 4.9057 10.6778L0.334784 6.27847C-0.111595 5.84885 -0.111595 5.15115 0.334784 4.72153C0.781163 4.29191 1.50608 4.29191 1.95246 4.72153L5.71633 8.34065L14.0511 0.322215C14.4975 -0.107405 15.2224 -0.107405 15.6688 0.322215H15.6652Z" fill="currentColor"/>
</svg>
`;
        }
      });
    }, 100);

    submitButton.setAttribute("disabled", true);

    if (
      password.length < 8 ||
      nameRegex.test(password) ||
      !/[A-Z]/.test(password)
    ) {
      submitButton.setAttribute("disabled", true);
    } else if (
      inputFields[1].value.length < 1 ||
      inputFields[2].value.length < 1
    ) {
      submitButton.setAttribute("disabled", true);
    } else {
      submitButton.removeAttribute("disabled", false);
    }

    inputFields.forEach((input) => {
      input.addEventListener("input", () => {
        const password = passwordInput.value;
        const name = document.querySelector("#name").value;
        const nameRegex = new RegExp(`\\b${name}\\b`, "i");

        if (
          password.length < 8 ||
          nameRegex.test(password) ||
          !/[A-Z]/.test(password)
        ) {
          submitButton.setAttribute("disabled", true);
        } else if (
          inputFields[1].value.length < 1 ||
          inputFields[2].value.length < 1
        ) {
          submitButton.setAttribute("disabled", true);
        } else {
          submitButton.removeAttribute("disabled", false);
        }
      });
    });

    passwordInput.addEventListener("input", () => {
      const name = document.querySelector("#name").value;
      const password = passwordInput.value;
      const nameRegex = new RegExp(`\\b${name}\\b`, "i");
      if (password.length >= 8) {
        authMinChars.classList.add("valid");
      } else {
        authMinChars.classList.remove("valid");
      }

      if (/[A-Z]/.test(password)) {
        authUppercase.classList.add("valid");
      } else {
        authUppercase.classList.remove("valid");
      }

      if (!nameRegex.test(password)) {
        authNotOwnName.classList.add("valid");
      } else {
        authNotOwnName.classList.remove("valid");
      }
    });
  }

  if (location.pathname === "/login") {
    const inputFields = document.querySelectorAll("input");
    const submitButton = document.querySelector(".submit-button");

    submitButton.setAttribute("disabled", true);

    if (inputFields[0].value.length > 0 && inputFields[1].value.length > 0) {
      submitButton.removeAttribute("disabled");
    } else {
      submitButton.setAttribute("disabled", true);
    }

    inputFields.forEach((input) => {
      input.addEventListener("input", () => {
        if (
          inputFields[0].value.length > 0 &&
          inputFields[1].value.length > 0
        ) {
          submitButton.removeAttribute("disabled");
        } else {
          submitButton.setAttribute("disabled", true);
        }
      });
    });
  }

  if (location.pathname.includes("/chat")) {
    const sendButton = document.querySelector(".send-message-button");
    const chatBox = document.querySelector("#chat-input");
    const chatMessages = document.querySelector(".chat-messages");
    const chatForm = document.querySelector(".chat-form");
    const voiceMessageButton = document.querySelector(".voice-button");

    function recordVoiceMessage() {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      // Visual feedback for recording state
      voiceMessageButton.classList.add("recording");
      chatBox.placeholder = "Listening...";

      // Start recognition
      recognition.start();

      // Handle results
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join("");

        chatBox.value = transcript;
        hideSendButton();
      };

      // Handle end of speech recognition
      recognition.onend = () => {
        voiceMessageButton.classList.remove("recording");
        chatBox.placeholder = "Type a message...";
      };

      // Handle errors
      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        voiceMessageButton.classList.remove("recording");
        chatBox.placeholder = "Type a message...";
      };
    }

    voiceMessageButton.addEventListener("click", () => {
      recordVoiceMessage();
    });

    function hideSendButton() {
      if (
        chatBox.value === "" ||
        chatBox.value === null ||
        chatBox.value === undefined
      ) {
        sendButton.style.display = "none";
        sendButton.setAttribute("disabled", true);
      } else {
        sendButton.style.display = "block";
        sendButton.removeAttribute("disabled");
      }
    }

    function scrollToLastMessage() {
      setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 75);
    }

    chatForm.addEventListener("submit", () => {
      setTimeout(() => {
        chatBox.value = "";
        scrollToLastMessage();
      }, 200);
    });

    scrollToLastMessage();

    hideSendButton();

    chatBox.addEventListener("input", () => {
      hideSendButton();
    });

    const chatId = location.pathname.split("/").pop();
    const evtSource = new EventSource(`http://localhost:3000/chat/stream`);

    evtSource.onmessage = (event) => {
      const newArticle = document.createElement("article");
      const newPelement = document.createElement("p");
      const data = JSON.parse(event.data);

      newArticle.classList.add("text-bubble");
      newArticle.classList.add("own-message");
      newArticle.appendChild(newPelement);

      newPelement.textContent = data.text;
      chatMessages.appendChild(newArticle);
    };
  }
});

// FIXME: CHECK WHO SEND THE MESSAGE AND THEN GIVE STYLING
// FIXME: MAKE IT MORE REALTIME
