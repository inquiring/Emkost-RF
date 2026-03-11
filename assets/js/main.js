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
  form.addEventListener("submit", (event) => {
    const phoneInput = form.querySelector("[data-phone-input]");

    if (phoneInput && !PHONE_PATTERN.test(phoneInput.value)) {
      phoneInput.setCustomValidity("Укажите телефон в формате +7 (999) 123-45-67.");
      phoneInput.reportValidity();
      event.preventDefault();
      return;
    }

    event.preventDefault();

    const status = form.querySelector(".form-status");

    if (status) {
      status.textContent =
        "Заявка принята. Мы свяжемся с вами для уточнения объема, задачи и города доставки.";
    }

    form.reset();
  });
});
