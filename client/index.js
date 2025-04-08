import "./index.css";

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
});

// TODO: Check is form is valid and disable button if not
