document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select dropdown
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list with participants preview
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `          
          <h4>${name}</h4>          
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            <strong>Participants:</strong>
            <!-- participants list injected here -->
                      </div>
        `;

        activitiesList.appendChild(activityCard);

        // Render participants (up to 5) and more-count with tooltip
        const participantsContainer = activityCard.querySelector('.participants-container');
        const participantsList = document.createElement('ul');
        participantsList.className = 'participants-list';

        const participantsToShow = details.participants.slice(0, 5);
        participantsToShow.forEach(p => {
          const li = createParticipantListItem(p, name);
          participantsList.appendChild(li);
        });

        participantsContainer.appendChild(participantsList);

        if (details.participants.length > 5) {
          const remaining = details.participants.length - 5;
          const remainingNames = details.participants.slice(5, 25); // show up to 20 names in tooltip

          const moreWrap = document.createElement('div');
          moreWrap.className = 'more-wrap';

          const moreBtn = document.createElement('button');
          moreBtn.type = 'button';
          moreBtn.className = 'more-count';
          moreBtn.textContent = `+${remaining} more`;
          moreBtn.setAttribute('aria-haspopup', 'dialog');

          // store full participants list in dataset for modal
          moreBtn.dataset.participants = JSON.stringify(details.participants);
          moreBtn.dataset.activity = name;

          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip';
          tooltip.textContent = remainingNames.join(', ');

          moreWrap.appendChild(moreBtn);
          moreWrap.appendChild(tooltip);
          participantsContainer.appendChild(moreWrap);

          // Click opens modal showing all participants
          moreBtn.addEventListener('click', () => {
            const all = JSON.parse(moreBtn.dataset.participants || '[]');
            openModal(all, name);
          });
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Modal helpers
  const modal = document.getElementById('participants-modal');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');
  const modalClose = document.getElementById('modal-close');
  const modalCloseBottom = document.getElementById('modal-close-bottom');
  const modalOverlay = document.getElementById('modal-overlay');

  function openModal(participants, activityName) {
    modalTitle.textContent = `${activityName} - Participants (${participants.length})`;
    modalBody.innerHTML = '';

    const ul = document.createElement('ul');
    ul.className = 'modal-participants-list';

    participants.forEach(p => {
      const li = createParticipantListItem(p, activityName);
      li.classList.add('participant-item');
      ul.appendChild(li);
    });

    modalBody.appendChild(ul);
    modal.classList.remove('hidden');
  }

  function createParticipantListItem(email, activityName) {
    const li = document.createElement('li');

    const label = document.createElement('span');
    label.textContent = email;

    const actions = document.createElement('div');
    actions.className = 'participant-actions';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-participant';
    deleteButton.innerHTML = '&#x2716;';
    deleteButton.setAttribute('aria-label', `Remove ${email} from ${activityName}`);

    deleteButton.addEventListener('click', async () => {
      await unregisterParticipant(activityName, email);
    });

    actions.appendChild(deleteButton);
    li.appendChild(label);
    li.appendChild(actions);

    return li;
  }

  async function unregisterParticipant(activityName, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || 'Failed to remove participant';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
      }

      setTimeout(() => {
        messageDiv.classList.add('hidden');
      }, 5000);
    } catch (error) {
      messageDiv.textContent = 'Failed to remove participant. Please try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
      console.error('Error removing participant:', error);
    }
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  modalClose.addEventListener('click', closeModal);
  modalCloseBottom.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities to update participant lists
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
