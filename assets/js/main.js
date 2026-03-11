const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -6% 0px",
  },
);

document.querySelectorAll("[data-reveal]").forEach((element) => {
  observer.observe(element);
});

const PHONE_MASK_PREFIX = "+7 ";
const PHONE_PATTERN = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "").replace(/^7/, "").slice(0, 10);

  let result = PHONE_MASK_PREFIX;

  if (digits.length > 0) {
    result += `(${digits.slice(0, 3)}`;
  }

  if (digits.length >= 4) {
    result += `) ${digits.slice(3, 6)}`;
  }

  if (digits.length >= 7) {
    result += `-${digits.slice(6, 8)}`;
  }

  if (digits.length >= 9) {
    result += `-${digits.slice(8, 10)}`;
  }

  return result;
};

document.querySelectorAll("[data-phone-input]").forEach((input) => {
  input.addEventListener("focus", () => {
    if (!input.value) {
      input.value = PHONE_MASK_PREFIX;
    }
  });

  input.addEventListener("input", () => {
    input.value = formatPhone(input.value);

    if (PHONE_PATTERN.test(input.value)) {
      input.setCustomValidity("");
      return;
    }

    input.setCustomValidity("Укажите телефон в формате +7 (999) 123-45-67.");
  });

  input.addEventListener("blur", () => {
    if (input.value === PHONE_MASK_PREFIX) {
      input.value = "";
    }
  });
});

document.querySelectorAll(".lead-form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    const phoneInput = form.querySelector("[data-phone-input]");
    const status = form.querySelector(".form-status");

    if (phoneInput && !PHONE_PATTERN.test(phoneInput.value)) {
      phoneInput.setCustomValidity("Укажите телефон в формате +7 (999) 123-45-67.");
      phoneInput.reportValidity();
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (status) {
      status.textContent = "Отправляем заявку...";
    }

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    try {
      if (window.location.protocol === "file:") {
        throw new Error(
          "Форма не работает при открытии файла напрямую. Запустите сайт через локальный сервер.",
        );
      }

      const response = await fetch(form.action, {
        method: form.method || "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Не удалось отправить заявку.");
      }

      if (status) {
        status.textContent = result.message;
      }

      form.reset();
    } catch (error) {
      let message = "Не удалось отправить заявку. Попробуйте еще раз.";

      if (error instanceof Error) {
        message = error.message;
      }

      if (
        message === "Failed to fetch" ||
        message.includes("Load failed") ||
        message.includes("NetworkError")
      ) {
        message =
          "Не удалось подключиться к обработчику формы. Запустите Node-сервер проекта или разместите сайт на хостинге с поддержкой Node.js.";
      }

      if (status) {
        status.textContent = message;
      }
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });
});
