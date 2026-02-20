      const logo = document.getElementById("brandLogo");
      const fallback = document.getElementById("brandFallback");
      if (logo && fallback) {
        logo.addEventListener("error", () => {
          logo.style.display = "none";
          fallback.style.display = "grid";
        });
      }
      document.body.setAttribute("data-dept", "Power");
      (function () {
        const cloudStatus = document.getElementById("projectCloudStatus");
        const workspace = document.getElementById("projectWorkspace");
        const loginBtn = document.getElementById("projectLoginBtn");
        const logoutBtn = document.getElementById("projectLogoutBtn");
        const userLabel = document.getElementById("projectUserLabel");
        const createStatus = document.getElementById("projectCreateStatus");
        const projectListWrap = document.getElementById("projectListWrap");
        const teamCard = document.getElementById("projectTeamCard");
        const teamList = document.getElementById("projectTeamList");
        const teamStatus = document.getElementById("projectTeamStatus");
        const teamRoleLabel = document.getElementById("projectTeamRole");
        const teamAddRow = document.getElementById("projectTeamAddRow");

        let currentUser = null;
        let selectedProject = null;
        let selectedRole = "";
        const projectsSidebar = document.getElementById("projectsSidebar");
        const projectsPropertyTabs = document.getElementById("projectsPropertyTabs");
        const projectsPropertyBody = document.getElementById("projectsPropertyBody");
        const projectsPropObject = document.getElementById("projectsPropObject");
        const projectsStatusPill = document.getElementById("projectsStatusPill");
        const projectsStatusText = document.getElementById("projectsStatusText");
        const PROJECT_PROP_TABS = ["General", "Signal / Routing", "Power", "Network", "Physical", "Notes"];
        let projectPropertyTab = "General";
        const MODULE_MENU = [
          { href: "projects.html", label: "Projects", iconKey: "projects", color: "#8b5cff", active: true },
          { href: "index.html?dept=Video", label: "Video", iconKey: "video", color: "#57b36a" },
          { href: "index.html?dept=Lighting", label: "Lighting", iconKey: "lighting", color: "#e25555" },
          { href: "index.html?dept=Sound", label: "Audio", iconKey: "audio", color: "#4f82ff" },
          { href: "index.html?dept=Rigging", label: "Rigging", iconKey: "rigging", color: "#f08a3c" },
          { href: "index.html?dept=Power", label: "Power", iconKey: "power", color: "#8b5cff" },
          { href: "index.html?dept=Venue", label: "3D", iconKey: "venue3d", color: "#35bdb0" },
          { href: "reports.html", label: "Reports", iconKey: "outputs", color: "#7c889f" },
          { href: "settings.html", label: "Settings", iconKey: "settings", color: "#8b5cff" }
        ];

        const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
        const setMsg = (el, msg, ok) => {
          if (!el) return;
          el.textContent = String(msg || "");
          el.style.color = ok ? "#c4ffe2" : "#ffb6c6";
        };
        const setMuted = (el, msg) => {
          if (!el) return;
          el.textContent = String(msg || "");
          el.style.color = "#b8b3c9";
        };
        function renderProjectsSidebar() {
          if (!projectsSidebar) return;
          const iconSvg = (key) => {
            const icons = {
              video: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="14" height="10" rx="2"></rect><path d="M17.5 8.5L21 6.8v7.4l-3.5-1.7z"></path><path d="M6 18.5h9"></path><path d="M10.5 15.5v3"></path></svg>',
              lighting: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4.5h10"></path><path d="M8.5 4.5v4l3.5 4v3"></path><path d="M15.5 4.5v4l-3.5 4"></path><path d="M9.5 18h5"></path><path d="M10.5 20h3"></path></svg>',
              audio: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 14h3l4.5 3.5V6.5L6.5 10h-3z"></path><path d="M14.5 10.2a4.2 4.2 0 0 1 0 3.6"></path><path d="M17.5 8a7.4 7.4 0 0 1 0 8"></path><path d="M20 5.5a11 11 0 0 1 0 13"></path></svg>',
              rigging: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16"></path><path d="M6.5 6.5l5.5 10 5.5-10"></path><path d="M9.2 11.4h5.6"></path><path d="M12 16.5v4"></path><circle cx="12" cy="21" r="1.4"></circle></svg>',
              power: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 4v6"></path><path d="M15.5 4v6"></path><path d="M6 10h12v4a6 6 0 0 1-12 0z"></path></svg>',
              venue3d: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"></path><path d="M12 12l8-4.5"></path><path d="M12 12v9"></path><path d="M12 12L4 7.5"></path></svg>',
              outputs: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="13" height="17" rx="2"></rect><path d="M8 8h5"></path><path d="M8 12h5"></path><path d="M8 16h3"></path><path d="M17 8.5h3.5"></path><path d="M18.8 6.8l1.7 1.7-1.7 1.7"></path></svg>',
              projects: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="8" height="6" rx="1.5"></rect><rect x="13" y="5" width="8" height="6" rx="1.5"></rect><rect x="8" y="13" width="8" height="6" rx="1.5"></rect><path d="M11 8h2"></path><path d="M12 11v2"></path></svg>',
              settings: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="2"></circle><circle cx="16" cy="12" r="2"></circle><circle cx="10" cy="17" r="2"></circle><path d="M10 7h10"></path><path d="M3.5 7H6"></path><path d="M3.5 12H14"></path><path d="M18 12h2.5"></path><path d="M3.5 17H8"></path><path d="M12 17h8.5"></path></svg>'
            };
            return icons[key] || icons.settings;
          };
          projectsSidebar.innerHTML = MODULE_MENU.map((m) => `
            <a href="${m.href}" style="text-decoration:none;">
              <button class="${m.active ? "active" : ""}" title="${m.label}">
                <span class="nav-icon" style="border-color:${m.color};color:${m.color};">${iconSvg(m.iconKey)}</span>
                <span class="nav-label">${m.label}</span>
              </button>
            </a>
          `).join("");
        }
        function getProjectPropertyRows() {
          const tab = String(projectPropertyTab || "General");
          if (tab === "General") return [
            { k: "Selected", v: selectedProject?.name || "No project selected" },
            { k: "Role", v: selectedRole || "-" },
            { k: "User", v: currentUser?.email || "Not signed in" }
          ];
          if (tab === "Network") return [
            { k: "Cloud Auth", v: window.TheBaseCloud?.isConfigured?.() ? "Configured" : "Local mode" },
            { k: "Sync", v: "Project snapshots stored per project" }
          ];
          if (tab === "Notes") return [
            { k: "Access", v: "Only assigned team members can access a project." },
            { k: "Flow", v: "New / Open / Export / Team management." }
          ];
          return [{ k: "Category", v: tab }];
        }
        function renderProjectsProperties() {
          if (!projectsPropertyTabs || !projectsPropertyBody || !projectsPropObject) return;
          projectsPropObject.textContent = selectedProject?.name ? "project" : "none";
          projectsPropertyTabs.innerHTML = PROJECT_PROP_TABS.map((tab) => `<button data-proj-prop-tab="${tab}" class="${tab === projectPropertyTab ? "active" : ""}">${tab}</button>`).join("");
          projectsPropertyBody.innerHTML = getProjectPropertyRows().map((r) => `
            <div class="property-row">
              <div class="property-key">${r.k}</div>
              <div class="property-val">${r.v}</div>
            </div>
          `).join("");
          projectsPropertyTabs.querySelectorAll("[data-proj-prop-tab]").forEach((btn) => {
            btn.addEventListener("click", () => {
              projectPropertyTab = btn.getAttribute("data-proj-prop-tab") || "General";
              renderProjectsProperties();
            });
          });
        }
        function renderProjectsStatus(level, text) {
          if (!projectsStatusPill || !projectsStatusText) return;
          const safeLevel = level || "READY";
          projectsStatusPill.textContent = safeLevel;
          projectsStatusPill.className = `status-pill ${safeLevel === "ERROR" ? "error" : (safeLevel === "WARN" ? "warn" : "ready")}`;
          projectsStatusText.textContent = text || "Project center ready";
        }

        async function renderProjectList() {
          if (!window.TheBaseCloud) return;
          let list = [];
          try {
            list = await TheBaseCloud.listProjects();
          } catch (err) {
            setMsg(projectListWrap, err?.message || "Failed to load projects", false);
            return;
          }
          if (!list.length) {
            projectListWrap.innerHTML = '<div class="muted">No projects yet. Create your first project above.</div>';
            teamCard.style.display = "none";
            renderProjectsProperties();
            renderProjectsStatus("WARN", "No projects found. Create your first project.");
            return;
          }
          const active = TheBaseCloud.getActiveProject();
          projectListWrap.innerHTML = `
            <div style="overflow:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:0.86rem;">
                <thead>
                  <tr>
                    <th style="text-align:left;border:1px solid var(--line);padding:0.35rem;">Name</th>
                    <th style="text-align:left;border:1px solid var(--line);padding:0.35rem;">Role</th>
                    <th style="text-align:left;border:1px solid var(--line);padding:0.35rem;">Updated</th>
                    <th style="text-align:left;border:1px solid var(--line);padding:0.35rem;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${list.map((p) => `
                    <tr>
                      <td style="border:1px solid var(--line);padding:0.35rem;"><strong>${esc(p.name)}</strong><div class="muted" style="font-size:0.78rem;">${esc(p.description || "")}</div></td>
                      <td style="border:1px solid var(--line);padding:0.35rem;">${esc(p.role || "member")}</td>
                      <td style="border:1px solid var(--line);padding:0.35rem;">${new Date(p.updated_at || p.created_at || Date.now()).toLocaleString()}</td>
                      <td style="border:1px solid var(--line);padding:0.35rem;">
                        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
                          <button data-open-project="${esc(p.id)}" class="${active?.id === p.id ? "primary" : ""}">Open Project</button>
                          <button data-export-project="${esc(p.id)}">Export Project</button>
                          <button data-team-project="${esc(p.id)}">Team</button>
                          ${String(p.role || "") === "owner" ? `<button data-delete-project="${esc(p.id)}">Delete</button>` : ""}
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `;

          projectListWrap.querySelectorAll("[data-open-project]").forEach((btn) => {
            btn.addEventListener("click", () => {
              const id = btn.getAttribute("data-open-project") || "";
              const project = list.find((p) => p.id === id);
              if (!project) return;
              TheBaseCloud.setActiveProject({ id: project.id, name: project.name });
              window.location.href = "index.html";
            });
          });

          projectListWrap.querySelectorAll("[data-export-project]").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const id = btn.getAttribute("data-export-project") || "";
              try {
                const project = list.find((p) => p.id === id);
                const snapshot = await TheBaseCloud.loadProjectSnapshot(id);
                const payload = {
                  project: project || null,
                  snapshot: snapshot?.snapshot || null,
                  exported_at: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${(project?.name || "project").replace(/\\s+/g, "_")}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                alert(err?.message || "Export failed");
              }
            });
          });

          projectListWrap.querySelectorAll("[data-team-project]").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const id = btn.getAttribute("data-team-project") || "";
              const project = list.find((p) => p.id === id);
              if (!project) return;
              selectedProject = project;
              selectedRole = project.role || "member";
              await renderTeam();
              renderProjectsProperties();
            });
          });
          projectListWrap.querySelectorAll("[data-delete-project]").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const id = btn.getAttribute("data-delete-project") || "";
              const project = list.find((p) => p.id === id);
              if (!project) return;
              const ok = window.confirm(`Delete project \"${project.name}\"? This cannot be undone.`);
              if (!ok) return;
              try {
                await TheBaseCloud.deleteProject(project.id);
                if (selectedProject?.id === project.id) {
                  selectedProject = null;
                  selectedRole = "";
                  teamCard.style.display = "none";
                }
                await renderProjectList();
              } catch (err) {
                alert(err?.message || "Failed to delete project");
              }
            });
          });
          renderProjectsProperties();
          renderProjectsStatus("READY", `Loaded ${list.length} project(s).`);
        }

        async function renderTeam() {
          if (!selectedProject) {
            teamCard.style.display = "none";
            renderProjectsProperties();
            return;
          }
          teamCard.style.display = "block";
          teamRoleLabel.textContent = `${selectedProject.name} (${selectedRole})`;
          teamAddRow.style.display = selectedRole === "owner" ? "grid" : "none";
          setMuted(teamStatus, selectedRole === "owner" ? "Owner controls enabled." : "Read-only. Only owners can manage team.");
          try {
            const members = await TheBaseCloud.listProjectMembers(selectedProject.id);
            teamList.innerHTML = `
              <div style="overflow:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.86rem;">
                  <thead><tr><th style="text-align:left;border:1px solid var(--line);padding:0.35rem;">Name</th><th style="text-align:left;border:1px solid var(--line);padding:0.35rem;">Email</th><th style="text-align:left;border:1px solid var(--line);padding:0.35rem;">Department</th><th style="text-align:left;border:1px solid var(--line);padding:0.35rem;">Role</th><th style="text-align:left;border:1px solid var(--line);padding:0.35rem;">Action</th></tr></thead>
                  <tbody>
                    ${members.map((m) => `
                      <tr>
                        <td style="border:1px solid var(--line);padding:0.35rem;">${esc(m.name || "User")}</td>
                        <td style="border:1px solid var(--line);padding:0.35rem;">${esc(m.email || "")}</td>
                        <td style="border:1px solid var(--line);padding:0.35rem;">${esc(m.department || "")}</td>
                        <td style="border:1px solid var(--line);padding:0.35rem;">${esc(m.role || "member")}</td>
                        <td style="border:1px solid var(--line);padding:0.35rem;">
                          ${selectedRole === "owner" && m.user_id !== currentUser?.id ? `<button data-remove-member="${esc(m.user_id)}">Remove</button>` : '<span class="muted">-</span>'}
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            `;
            if (selectedRole === "owner") {
              teamList.querySelectorAll("[data-remove-member]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                  const userId = btn.getAttribute("data-remove-member");
                  if (!userId) return;
                  try {
                    await TheBaseCloud.removeMember(selectedProject.id, userId);
                    await renderTeam();
                  } catch (err) {
                    setMsg(teamStatus, err?.message || "Failed to remove member", false);
                  }
                });
              });
            }
            renderProjectsProperties();
          } catch (err) {
            setMsg(teamStatus, err?.message || "Failed to load team", false);
            renderProjectsStatus("WARN", err?.message || "Failed to load team");
          }
        }

        document.getElementById("projectCreateBtn")?.addEventListener("click", async () => {
          const name = document.getElementById("projectNameInput")?.value || "";
          const description = document.getElementById("projectDescInput")?.value || "";
          if (!name.trim()) {
            setMsg(createStatus, "Project name is required", false);
            return;
          }
          try {
            const project = await TheBaseCloud.createProject(name, description);
            setMsg(createStatus, "Project created.", true);
            TheBaseCloud.setActiveProject({ id: project.id, name: project.name });
            document.getElementById("projectNameInput").value = "";
            document.getElementById("projectDescInput").value = "";
            await renderProjectList();
          } catch (err) {
            setMsg(createStatus, err?.message || "Create project failed", false);
          }
        });

        document.getElementById("projectAddMemberBtn")?.addEventListener("click", async () => {
          if (!selectedProject || selectedRole !== "owner") return;
          const email = document.getElementById("projectMemberEmail")?.value || "";
          const role = document.getElementById("projectMemberRole")?.value || "member";
          try {
            await TheBaseCloud.addMemberByEmail(selectedProject.id, email, role);
            setMsg(teamStatus, "Team member added.", true);
            document.getElementById("projectMemberEmail").value = "";
            await renderTeam();
          } catch (err) {
            setMsg(teamStatus, err?.message || "Failed to add member", false);
          }
        });

        logoutBtn?.addEventListener("click", async () => {
          try {
            await TheBaseCloud.signOut();
          } finally {
            window.location.href = "login.html?next=projects.html";
          }
        });

        async function bootstrap() {
          renderProjectsSidebar();
          renderProjectsProperties();
          renderProjectsStatus("READY", "Initializing project center");
          if (!window.TheBaseCloud || !TheBaseCloud.isConfigured()) return;
          try {
            await TheBaseCloud.init();
            currentUser = await TheBaseCloud.getUser();
            if (!currentUser) {
              const modeText = TheBaseCloud.isCloudMode && TheBaseCloud.isCloudMode()
                ? "Cloud mode: not signed in. Login to access project database."
                : "Local mode: not signed in. Create/login account to access projects.";
              setMuted(cloudStatus, modeText);
              loginBtn.style.display = "inline-block";
              logoutBtn.style.display = "none";
              workspace.style.display = "none";
              renderProjectsStatus("WARN", "Not signed in");
              return;
            }
            await TheBaseCloud.ensureProfile(currentUser);
            userLabel.textContent = `${currentUser.user_metadata?.name || currentUser.email || "User"}`;
            loginBtn.style.display = "none";
            logoutBtn.style.display = "inline-block";
            workspace.style.display = "block";
            setMuted(
              cloudStatus,
              (TheBaseCloud.isCloudMode && TheBaseCloud.isCloudMode())
                ? "Cloud connected. Projects are private to assigned team members."
                : "Local mode active. Projects are private per local account and project membership."
            );
            renderProjectsStatus("READY", "Connected and ready");
            await renderProjectList();
          } catch (err) {
            setMsg(cloudStatus, err?.message || "Failed to initialize cloud", false);
            workspace.style.display = "none";
            renderProjectsStatus("ERROR", err?.message || "Cloud initialization failed");
          }
        }

        bootstrap();
      })();
