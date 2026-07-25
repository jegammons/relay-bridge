document.addEventListener("DOMContentLoaded", () => {
  const config = window.RELAY_BRIDGE_CONFIG;
  const statusEl = document.getElementById("status");
  const textEl = document.getElementById("dictation-text");
  const copyButton = document.getElementById("copy-button");
  const refreshButton = document.getElementById("refresh-button");
  const signInButton = document.getElementById("sign-in-button");

  if (!config || !config.apiToken || config.apiToken.startsWith("PASTE_")) {
    statusEl.textContent = "Set up config.js first - see SETUP.md.";
    return;
  }

  CloudKit.configure({
    containers: [
      {
        containerIdentifier: config.containerIdentifier,
        apiTokenAuth: { apiToken: config.apiToken, persist: true },
        environment: config.environment,
      },
    ],
  });

  const container = CloudKit.getDefaultContainer();

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function fetchLatest() {
    setStatus("Loading...");
    container.privateCloudDatabase
      .fetchRecords("current")
      .then((response) => {
        const record = response.records && response.records[0];
        if (record && record.fields && record.fields.text) {
          textEl.value = record.fields.text.value;
          const updatedAt = record.fields.updatedAt ? new Date(record.fields.updatedAt.value) : null;
          setStatus(updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Loaded.");
        } else {
          textEl.value = "";
          setStatus('Nothing sent yet - dictate on your phone, then tap "Send to Work Bridge."');
        }
      })
      .catch(() => {
        textEl.value = "";
        setStatus('Nothing sent yet - dictate on your phone, then tap "Send to Work Bridge."');
      });
  }

  function goToSignedIn() {
    signInButton.style.display = "none";
    refreshButton.style.display = "inline-block";
    fetchLatest();
  }

  function goToSignedOut() {
    signInButton.style.display = "inline-block";
    refreshButton.style.display = "none";
    setStatus("Sign in with your Apple ID to see your dictation.");
  }

  container.setUpAuth().then((userIdentity) => {
    if (userIdentity) {
      goToSignedIn();
    } else {
      goToSignedOut();
    }
  });

  signInButton.addEventListener("click", () => {
    container.whenUserSignsIn().then(goToSignedIn);
  });

  refreshButton.addEventListener("click", fetchLatest);

  copyButton.addEventListener("click", () => {
    textEl.select();
    navigator.clipboard.writeText(textEl.value).then(() => {
      setStatus("Copied - paste into Outlook.");
    });
  });
});
