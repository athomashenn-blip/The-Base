(function () {
  const ACTIVE_PROJECT_KEY = "thebase.activeProject.v1";
  const ALLOWED_DEPARTMENTS = new Set([
    "Video",
    "Audio",
    "Lighting",
    "General",
    "Operations",
    "Warehouse"
  ]);

  const LOCAL_USERS_KEY = "thebase.local.users.v1";
  const LOCAL_SESSION_KEY = "thebase.local.session.v1";
  const LOCAL_PROJECTS_KEY = "thebase.local.projects.v1";
  const LOCAL_MEMBERS_KEY = "thebase.local.members.v1";
  const LOCAL_SNAPSHOTS_KEY = "thebase.local.snapshots.v1";

  const CLOUD_ENABLED = () => Boolean(
    String(window.THE_BASE_SUPABASE_URL || "").trim()
      && String(window.THE_BASE_SUPABASE_ANON_KEY || "").trim()
  );

  let client = null;

  function useCloud() {
    return CLOUD_ENABLED() && Boolean(window.supabase && typeof window.supabase.createClient === "function");
  }

  function isConfigured() {
    // Local mode is always available.
    return true;
  }

  function normalizeEmail(v) {
    return String(v || "").trim().toLowerCase();
  }

  function normalizeDepartment(v) {
    const raw = String(v || "").trim();
    if (ALLOWED_DEPARTMENTS.has(raw)) return raw;
    return "General";
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getLocalUsers() {
    const users = readJson(LOCAL_USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  }

  function setLocalUsers(users) {
    writeJson(LOCAL_USERS_KEY, Array.isArray(users) ? users : []);
  }

  function getLocalSessionRaw() {
    return readJson(LOCAL_SESSION_KEY, null);
  }

  function setLocalSessionRaw(session) {
    if (!session) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      return;
    }
    writeJson(LOCAL_SESSION_KEY, session);
  }

  function getLocalProjects() {
    const rows = readJson(LOCAL_PROJECTS_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function setLocalProjects(rows) {
    writeJson(LOCAL_PROJECTS_KEY, Array.isArray(rows) ? rows : []);
  }

  function getLocalMembers() {
    const rows = readJson(LOCAL_MEMBERS_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function setLocalMembers(rows) {
    writeJson(LOCAL_MEMBERS_KEY, Array.isArray(rows) ? rows : []);
  }

  function getLocalSnapshots() {
    const rows = readJson(LOCAL_SNAPSHOTS_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function setLocalSnapshots(rows) {
    writeJson(LOCAL_SNAPSHOTS_KEY, Array.isArray(rows) ? rows : []);
  }

  function toPublicUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      user_metadata: {
        name: user.name || "User",
        department: normalizeDepartment(user.department)
      }
    };
  }

  function getLocalCurrentUserRaw() {
    const session = getLocalSessionRaw();
    const userId = String(session?.user_id || "");
    if (!userId) return null;
    const users = getLocalUsers();
    return users.find((u) => String(u.id) === userId) || null;
  }

  async function init() {
    if (!useCloud()) return null;
    if (client) return client;
    client = window.supabase.createClient(
      String(window.THE_BASE_SUPABASE_URL || "").trim(),
      String(window.THE_BASE_SUPABASE_ANON_KEY || "").trim(),
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
    return client;
  }

  async function getSession() {
    if (useCloud()) {
      const c = await init();
      if (!c) return null;
      const { data } = await c.auth.getSession();
      return data?.session || null;
    }
    const user = getLocalCurrentUserRaw();
    if (!user) return null;
    return {
      access_token: "local",
      user: toPublicUser(user)
    };
  }

  async function getUser() {
    if (useCloud()) {
      const session = await getSession();
      return session?.user || null;
    }
    return toPublicUser(getLocalCurrentUserRaw());
  }

  async function requireSession(redirectTo) {
    const user = await getUser();
    if (user) return user;
    if (redirectTo) {
      const next = encodeURIComponent(window.location.href);
      window.location.href = `${redirectTo}?next=${next}`;
    }
    return null;
  }

  async function ensureProfile(user) {
    if (useCloud()) {
      const c = await init();
      if (!c) return null;
      const u = user || (await getUser());
      if (!u) return null;
      const meta = u.user_metadata || {};
      const payload = {
        id: u.id,
        email: normalizeEmail(u.email),
        name: String(meta.name || u.email || "User"),
        department: normalizeDepartment(meta.department)
      };
      const { error } = await c.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return payload;
    }

    const u = user || (await getUser());
    if (!u) return null;
    const users = getLocalUsers();
    const idx = users.findIndex((row) => String(row.id) === String(u.id));
    if (idx < 0) return null;
    const meta = u.user_metadata || {};
    users[idx] = {
      ...users[idx],
      name: String(meta.name || users[idx].name || users[idx].email || "User"),
      department: normalizeDepartment(meta.department || users[idx].department),
      updated_at: nowIso()
    };
    setLocalUsers(users);
    return {
      id: users[idx].id,
      email: users[idx].email,
      name: users[idx].name,
      department: users[idx].department
    };
  }

  async function signIn(email, password) {
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = String(password || "");

    if (useCloud()) {
      const c = await init();
      if (!c) throw new Error("Cloud auth is not configured");
      const { data, error } = await c.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });
      if (error) throw error;
      await ensureProfile(data?.user || null);
      return data;
    }

    const users = getLocalUsers();
    const user = users.find((u) => u.email === cleanEmail);
    if (!user || user.password !== cleanPassword) {
      throw new Error("Invalid email or password");
    }
    setLocalSessionRaw({ user_id: user.id, signed_in_at: nowIso() });
    return { user: toPublicUser(user), session: await getSession() };
  }

  async function signUp(email, password, name, department) {
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = String(password || "");
    const cleanName = String(name || "").trim();
    const cleanDepartment = normalizeDepartment(department);

    if (!cleanEmail) throw new Error("Email is required");
    if (cleanPassword.length < 6) throw new Error("Password must be at least 6 characters");
    if (!cleanName) throw new Error("Name is required");

    if (useCloud()) {
      const c = await init();
      if (!c) throw new Error("Cloud auth is not configured");
      const { data, error } = await c.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            name: cleanName,
            department: cleanDepartment
          }
        }
      });
      if (error) throw error;
      if (data?.user) await ensureProfile(data.user);
      return data;
    }

    const users = getLocalUsers();
    if (users.some((u) => u.email === cleanEmail)) {
      throw new Error("An account with this email already exists");
    }
    const row = {
      id: makeId("usr"),
      email: cleanEmail,
      password: cleanPassword,
      name: cleanName,
      department: cleanDepartment,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    users.push(row);
    setLocalUsers(users);
    setLocalSessionRaw({ user_id: row.id, signed_in_at: nowIso() });
    return { user: toPublicUser(row), session: await getSession() };
  }

  async function signOut() {
    if (useCloud()) {
      const c = await init();
      if (!c) return;
      await c.auth.signOut();
      clearActiveProject();
      return;
    }
    setLocalSessionRaw(null);
    clearActiveProject();
  }

  function setActiveProject(project) {
    if (!project || !project.id) return;
    const safe = {
      id: String(project.id),
      name: String(project.name || "Project")
    };
    localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(safe));
  }

  function getActiveProject() {
    try {
      const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p || typeof p !== "object" || !p.id) return null;
      return { id: String(p.id), name: String(p.name || "Project") };
    } catch (_) {
      return null;
    }
  }

  function clearActiveProject() {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }

  async function createProject(name, description) {
    const user = await requireSession();
    if (!user) throw new Error("Not signed in");
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Project name is required");

    if (useCloud()) {
      const c = await init();
      if (!c) throw new Error("Cloud project DB is not configured");
      const { data: inserted, error: pErr } = await c
        .from("projects")
        .insert({
          name: cleanName,
          description: String(description || "").trim() || null,
          owner_id: user.id
        })
        .select("id,name,description,owner_id,created_at,updated_at")
        .single();
      if (pErr) throw pErr;

      const { error: mErr } = await c.from("project_members").insert({
        project_id: inserted.id,
        user_id: user.id,
        role: "owner"
      });
      if (mErr) throw mErr;
      return inserted;
    }

    const projects = getLocalProjects();
    const members = getLocalMembers();
    const row = {
      id: makeId("prj"),
      name: cleanName,
      description: String(description || "").trim() || null,
      owner_id: user.id,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    projects.push(row);
    members.push({ project_id: row.id, user_id: user.id, role: "owner", created_at: nowIso() });
    setLocalProjects(projects);
    setLocalMembers(members);
    return row;
  }

  async function listProjects() {
    const user = await requireSession();
    if (!user) return [];

    if (useCloud()) {
      const c = await init();
      if (!c) return [];
      const { data, error } = await c
        .from("project_members")
        .select("role,projects(id,name,description,owner_id,created_at,updated_at)")
        .eq("user_id", user.id)
        .order("created_at", { foreignTable: "projects", ascending: false });
      if (error) throw error;

      return (data || [])
        .map((row) => {
          const p = row.projects;
          if (!p || !p.id) return null;
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            owner_id: p.owner_id,
            created_at: p.created_at,
            updated_at: p.updated_at,
            role: row.role || "member"
          };
        })
        .filter(Boolean);
    }

    const projects = getLocalProjects();
    const members = getLocalMembers();
    return members
      .filter((m) => String(m.user_id) === String(user.id))
      .map((m) => {
        const p = projects.find((row) => String(row.id) === String(m.project_id));
        if (!p) return null;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          owner_id: p.owner_id,
          created_at: p.created_at,
          updated_at: p.updated_at,
          role: m.role || "member"
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  }

  async function userCanAccessProject(projectId) {
    const user = await requireSession();
    if (!user || !projectId) return false;

    if (useCloud()) {
      const c = await init();
      if (!c) return false;
      const { data, error } = await c
        .from("project_members")
        .select("project_id")
        .eq("project_id", String(projectId))
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data && data.project_id);
    }

    const members = getLocalMembers();
    return members.some((m) => String(m.project_id) === String(projectId) && String(m.user_id) === String(user.id));
  }

  async function getProject(projectId) {
    if (!projectId) return null;

    if (useCloud()) {
      const c = await init();
      if (!c) return null;
      const { data, error } = await c
        .from("projects")
        .select("id,name,description,owner_id,created_at,updated_at")
        .eq("id", String(projectId))
        .maybeSingle();
      if (error) throw error;
      return data || null;
    }

    const projects = getLocalProjects();
    return projects.find((p) => String(p.id) === String(projectId)) || null;
  }

  async function saveProjectSnapshot(projectId, snapshot) {
    if (!projectId) throw new Error("Project ID is required");
    const user = await requireSession();
    if (!user) throw new Error("Not signed in");

    if (useCloud()) {
      const c = await init();
      if (!c) throw new Error("Cloud project DB is not configured");
      const payload = {
        project_id: String(projectId),
        snapshot: snapshot && typeof snapshot === "object" ? snapshot : {},
        updated_by: user.id,
        updated_at: nowIso()
      };
      const { error } = await c.from("project_snapshots").upsert(payload, { onConflict: "project_id" });
      if (error) throw error;
      return true;
    }

    const canAccess = await userCanAccessProject(projectId);
    if (!canAccess) throw new Error("No access to this project");
    const rows = getLocalSnapshots();
    const idx = rows.findIndex((r) => String(r.project_id) === String(projectId));
    const payload = {
      project_id: String(projectId),
      snapshot: snapshot && typeof snapshot === "object" ? snapshot : {},
      updated_by: user.id,
      updated_at: nowIso()
    };
    if (idx >= 0) rows[idx] = payload;
    else rows.push(payload);
    setLocalSnapshots(rows);
    const projects = getLocalProjects();
    const pIdx = projects.findIndex((p) => String(p.id) === String(projectId));
    if (pIdx >= 0) {
      projects[pIdx] = { ...projects[pIdx], updated_at: payload.updated_at };
      setLocalProjects(projects);
    }
    return true;
  }

  async function loadProjectSnapshot(projectId) {
    if (!projectId) return null;

    if (useCloud()) {
      const c = await init();
      if (!c) return null;
      const { data, error } = await c
        .from("project_snapshots")
        .select("project_id,snapshot,updated_at,updated_by")
        .eq("project_id", String(projectId))
        .maybeSingle();
      if (error) throw error;
      return data || null;
    }

    const rows = getLocalSnapshots();
    return rows.find((r) => String(r.project_id) === String(projectId)) || null;
  }

  async function listProjectMembers(projectId) {
    if (!projectId) return [];

    if (useCloud()) {
      const c = await init();
      if (!c) return [];
      const { data, error } = await c
        .from("project_members")
        .select("user_id,role,profiles(name,email,department)")
        .eq("project_id", String(projectId));
      if (error) throw error;
      return (data || []).map((r) => ({
        user_id: r.user_id,
        role: r.role || "member",
        name: r.profiles?.name || "User",
        email: r.profiles?.email || "",
        department: r.profiles?.department || ""
      }));
    }

    const users = getLocalUsers();
    const members = getLocalMembers();
    return members
      .filter((m) => String(m.project_id) === String(projectId))
      .map((m) => {
        const user = users.find((u) => String(u.id) === String(m.user_id));
        return {
          user_id: m.user_id,
          role: m.role || "member",
          name: user?.name || "User",
          email: user?.email || "",
          department: normalizeDepartment(user?.department)
        };
      });
  }

  async function addMemberByEmail(projectId, email, role) {
    if (!projectId) throw new Error("Project ID is required");
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) throw new Error("Email is required");
    const safeRole = role === "owner" ? "owner" : "member";

    if (useCloud()) {
      const c = await init();
      if (!c) throw new Error("Cloud project DB is not configured");
      const { data: profile, error: pErr } = await c
        .from("profiles")
        .select("id,email")
        .eq("email", cleanEmail)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile?.id) throw new Error("User not found. Ask them to sign up first.");

      const { error } = await c.from("project_members").upsert(
        { project_id: String(projectId), user_id: profile.id, role: safeRole },
        { onConflict: "project_id,user_id" }
      );
      if (error) throw error;
      return true;
    }

    const users = getLocalUsers();
    const profile = users.find((u) => u.email === cleanEmail);
    if (!profile?.id) throw new Error("User not found. Ask them to sign up first.");
    const members = getLocalMembers();
    const idx = members.findIndex((m) => String(m.project_id) === String(projectId) && String(m.user_id) === String(profile.id));
    if (idx >= 0) {
      members[idx] = { ...members[idx], role: safeRole };
    } else {
      members.push({ project_id: String(projectId), user_id: profile.id, role: safeRole, created_at: nowIso() });
    }
    setLocalMembers(members);
    return true;
  }

  async function removeMember(projectId, userId) {
    if (!projectId || !userId) throw new Error("Project and user IDs are required");

    if (useCloud()) {
      const c = await init();
      if (!c) throw new Error("Cloud project DB is not configured");
      const { error } = await c
        .from("project_members")
        .delete()
        .eq("project_id", String(projectId))
        .eq("user_id", String(userId));
      if (error) throw error;
      return true;
    }

    const members = getLocalMembers().filter(
      (m) => !(String(m.project_id) === String(projectId) && String(m.user_id) === String(userId))
    );
    setLocalMembers(members);
    return true;
  }
  async function deleteProject(projectId) {
    if (!projectId) throw new Error("Project ID is required");
    const user = await requireSession();
    if (!user) throw new Error("Not signed in");

    if (useCloud()) {
      const c = await init();
      if (!c) throw new Error("Cloud project DB is not configured");
      const { error } = await c.from("projects").delete().eq("id", String(projectId));
      if (error) throw error;
      const active = getActiveProject();
      if (active?.id === String(projectId)) clearActiveProject();
      return true;
    }

    const projects = getLocalProjects();
    const row = projects.find((p) => String(p.id) === String(projectId));
    if (!row) return true;
    if (String(row.owner_id) !== String(user.id)) throw new Error("Only project owner can delete this project");

    setLocalProjects(projects.filter((p) => String(p.id) !== String(projectId)));
    setLocalMembers(getLocalMembers().filter((m) => String(m.project_id) !== String(projectId)));
    setLocalSnapshots(getLocalSnapshots().filter((s) => String(s.project_id) !== String(projectId)));
    const active = getActiveProject();
    if (active?.id === String(projectId)) clearActiveProject();
    return true;
  }

  window.TheBaseCloud = {
    isConfigured,
    isCloudMode: useCloud,
    init,
    getSession,
    getUser,
    requireSession,
    ensureProfile,
    signIn,
    signUp,
    signOut,
    setActiveProject,
    getActiveProject,
    clearActiveProject,
    createProject,
    listProjects,
    userCanAccessProject,
    getProject,
    saveProjectSnapshot,
    loadProjectSnapshot,
    listProjectMembers,
    addMemberByEmail,
    removeMember,
    deleteProject
  };
})();
