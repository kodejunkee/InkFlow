document.addEventListener("DOMContentLoaded", () => {
  // Intersection Observer for fade-in animations
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".fade-in-up").forEach(el => {
    observer.observe(el);
  });

  // Fetch Download Count from GitHub Releases API
  // Replace 'kodejunkee' and 'InkFlow' with the actual repository details if different
  const repoOwner = "kodejunkee";
  const repoName = "InkFlow";
  const counterElement = document.getElementById("count");

  async function fetchDownloadCount() {
    try {
      const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`);
      
      if (!response.ok) {
        throw new Error("Release not found");
      }

      const data = await response.json();
      
      // Calculate total downloads across all assets in the latest release
      let totalDownloads = 0;
      if (data.assets && data.assets.length > 0) {
        data.assets.forEach(asset => {
          totalDownloads += asset.download_count;
        });
      }

      counterElement.textContent = totalDownloads.toLocaleString();
    } catch (error) {
      console.log("Error fetching download count:", error);
      // Fallback if no release exists yet or API limit reached
      counterElement.textContent = "0";
    }
  }

  fetchDownloadCount();
});
