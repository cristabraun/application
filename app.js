const FORM_ENDPOINT = "/api/apply";
const CALCOM_URL = "https://cal.com/crista-braun-c6oimr/30min";

const form = document.querySelector("#coachingApplication");
const statusMessage = document.querySelector("#formStatus");
const introVideo = document.querySelector(".intro-video");
const videoShell = document.querySelector(".hero__media");
const videoPlayButton = document.querySelector(".video-play-button");
const quizSteps = Array.from(document.querySelectorAll("[data-step]"));
const progressBar = document.querySelector(".quiz-progress__bar");
const backButton = document.querySelector("[data-quiz-back]");
const nextButton = document.querySelector("[data-quiz-next]");
const submitButton = document.querySelector("[data-quiz-submit]");
let currentStep = 0;

function isConfigured(value) {
  return value && !value.includes("replace-with-your");
}

function setStatus(message, tone = "success") {
  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;
}

function buildCalcomUrl(formData) {
  const url = new URL(CALCOM_URL);
  const firstName = formData.get("first_name") || "";
  const lastName = formData.get("last_name") || "";
  const name = `${firstName} ${lastName}`.trim();
  const email = formData.get("email") || "";

  if (name) {
    url.searchParams.set("name", name);
  }

  if (email) {
    url.searchParams.set("email", email);
  }

  return url.toString();
}

function goToCalcom(formData) {
  window.location.assign(buildCalcomUrl(formData));
}

function getStepFields(step) {
  return Array.from(step.querySelectorAll("input, textarea, select"));
}

function validateStep(step) {
  const fields = getStepFields(step);
  const invalidField = fields.find((field) => !field.checkValidity());

  if (invalidField) {
    invalidField.reportValidity();
    return false;
  }

  return true;
}

function validateAllSteps() {
  const invalidStepIndex = quizSteps.findIndex((step) =>
    getStepFields(step).some((field) => !field.checkValidity()),
  );

  if (invalidStepIndex >= 0) {
    showStep(invalidStepIndex);
    validateStep(quizSteps[invalidStepIndex]);
    return false;
  }

  return true;
}

function showStep(index) {
  currentStep = Math.min(Math.max(index, 0), quizSteps.length - 1);

  quizSteps.forEach((step, stepIndex) => {
    const isActive = stepIndex === currentStep;
    step.hidden = !isActive;
    step.classList.toggle("is-active", isActive);
  });

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === quizSteps.length - 1;
  const progress = ((currentStep + 1) / quizSteps.length) * 100;

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  if (backButton) {
    backButton.disabled = isFirstStep;
  }

  if (nextButton) {
    nextButton.hidden = isLastStep;
  }

  if (submitButton) {
    submitButton.hidden = !isLastStep;
  }

}

if (introVideo && videoShell && videoPlayButton) {
  const playPreview = () => {
    introVideo.muted = true;
    introVideo.loop = true;
    introVideo.controls = false;
    introVideo.play().catch(() => {});
  };

  playPreview();
  window.addEventListener("pageshow", playPreview);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !videoShell.classList.contains("is-playing-with-sound")) {
      playPreview();
    }
  });

  videoPlayButton.addEventListener("click", async () => {
    introVideo.currentTime = 0;
    introVideo.muted = false;
    introVideo.loop = false;
    introVideo.controls = true;
    videoShell.classList.add("is-playing-with-sound");

    try {
      await introVideo.play();
    } catch (error) {
      videoShell.classList.remove("is-playing-with-sound");
    }
  });

  introVideo.addEventListener("ended", () => {
    introVideo.controls = false;
    introVideo.muted = true;
    introVideo.loop = true;
    videoShell.classList.remove("is-playing-with-sound");
    playPreview();
  });
}

if (quizSteps.length) {
  showStep(0);

  nextButton?.addEventListener("click", () => {
    if (!validateStep(quizSteps[currentStep])) {
      return;
    }

    showStep(currentStep + 1);
  });

  backButton?.addEventListener("click", () => {
    showStep(currentStep - 1);
  });

  quizSteps.forEach((step) => {
    step.addEventListener("change", (event) => {
      const field = event.target;

      if (!(field instanceof HTMLInputElement) || field.type !== "radio") {
        return;
      }

      if (validateStep(step) && currentStep < quizSteps.length - 1) {
        window.setTimeout(() => showStep(currentStep + 1), 180);
      }
    });

    step.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      event.preventDefault();

      if (validateStep(step) && currentStep < quizSteps.length - 1) {
        showStep(currentStep + 1);
      }
    });
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateAllSteps()) {
    return;
  }

  const formData = new FormData(form);

  if (!isConfigured(FORM_ENDPOINT)) {
    setStatus(
      "The page is ready, but the email notification endpoint still needs to be connected. Sending you to scheduling now.",
      "error",
    );
    goToCalcom(formData);
    return;
  }

  submitButton.disabled = true;
  setStatus("Submitting your application...");

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData)),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Application submission failed.");
    }

    setStatus("Application submitted. Sending you to scheduling now.");
    goToCalcom(formData);
  } catch (error) {
    setStatus("Something went wrong. Please try again or email me directly.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
