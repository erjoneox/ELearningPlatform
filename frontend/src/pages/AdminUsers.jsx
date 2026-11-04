import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, CircleCheck, Pencil, Search } from "lucide-react";
import Swal from "sweetalert2";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRoleFilter, setActiveRoleFilter] = useState("All Users");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "Student",
    status: "Active",
    password: "",
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/users");
      setUsers(response.data.users || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((account) => {
    const matchesRole =
      activeRoleFilter === "All Users" ||
      (activeRoleFilter === "Admins"
        ? account.Role === "Admin"
        : account.Role === activeRoleFilter.slice(0, -1));
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      `${account.FirstName || ""} ${account.LastName || ""} ${account.Email || ""}`
        .toLowerCase()
        .includes(normalizedSearch);

    return matchesRole && matchesSearch;
  });

  function startEditing(account) {
    setEditingUserId(account.UserID);
    setForm({
      firstName: account.FirstName || "",
      lastName: account.LastName || "",
      email: account.Email || "",
      role: account.Role,
      status: account.Status,
      password: "",
    });
  }

  async function saveUser(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await api.put(`/users/${editingUserId}`, {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password || undefined,
      });
      setEditingUserId(null);
      await loadUsers();
      await Swal.fire({
        icon: "success",
        title: "User updated",
        text: "The account changes were saved.",
      });
    } catch (requestError) {
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: requestError.response?.data?.message || "Could not update user.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(account, status) {
    const isDeactivation = status === "Inactive";
    const result = await Swal.fire({
      title: isDeactivation
        ? "Deactivate this account?"
        : "Reactivate account?",
      text: isDeactivation
        ? "The user will no longer be able to sign in. Existing course work and records will be retained."
        : "The user will be able to sign in again.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: isDeactivation ? "Deactivate" : "Reactivate",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      if (isDeactivation) {
        await api.delete(`/users/${account.UserID}`);
      } else {
        await api.patch(`/users/${account.UserID}/status`, { status });
      }
      await loadUsers();
    } catch (requestError) {
      await Swal.fire({
        icon: "error",
        title: "Account update failed",
        text:
          requestError.response?.data?.message ||
          "Could not update the account status.",
      });
    }
  }

  return (
    <main className="container py-5">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="fw-bold text-dark fs-3 mb-1">User Management</h1>
          <p className="text-secondary small mb-0">
            Admin-only account editing, role management, and access controls.
          </p>
        </div>
        <Link
          to="/register"
          className="btn text-white fw-semibold px-4 py-2 rounded-3 shadow-sm d-flex align-items-center gap-2"
          style={{ backgroundColor: "#5640EE" }}
        >
          <span>+</span> Create student or instructor
        </Link>
      </div>

      <div className="alert alert-info border-0 shadow-sm rounded-4 mb-4 d-flex align-items-center gap-2">
        <span>
          Deactivating an account blocks sign-in but preserves its courses,
          submissions, and other learning records.
        </span>
      </div>

      {error && (
        <div
          className="alert alert-danger border-0 shadow-sm rounded-4 d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger fw-semibold"
            onClick={loadUsers}
          >
            Retry
          </button>
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="nav nav-pills gap-1">
            {["All Users", "Students", "Instructors", "Admins"].map((tab) => {
              const isActive = tab === activeRoleFilter;
              return (
                <button
                  type="button"
                  key={tab}
                  className={`btn btn-sm px-3 py-2 rounded-pill fw-semibold ${
                    isActive
                      ? "text-primary bg-primary bg-opacity-10 shadow-sm"
                      : "text-secondary bg-transparent border-0"
                  }`}
                  style={isActive ? { color: "#5640EE" } : {}}
                  aria-pressed={isActive}
                  onClick={() => setActiveRoleFilter(tab)}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="input-group" style={{ maxWidth: "300px" }}>
            <span className="input-group-text bg-light border-0 text-muted ps-3">
              <Search size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <input
              type="text"
              className="form-control bg-light border-0 py-2"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted py-5 text-center">
          <p role="status" className="mb-0">
            Loading users...
          </p>
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
          <div className="table-responsive mb-0">
            <table className="table table-hover align-middle mb-0">
              <thead
                className="table-light text-secondary uppercase fs-7"
                style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
              >
                <tr>
                  <th className="py-3 px-4">NAME</th>
                  <th className="py-3">EMAIL</th>
                  <th className="py-3">ROLE</th>
                  <th className="py-3">STATUS</th>
                  <th className="py-3">CREATED</th>
                  <th className="py-3 px-4 text-end">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((account) => {
                  const isEditing = editingUserId === account.UserID;
                  const isCurrentUser =
                    Number(account.UserID) === Number(currentUser?.userId);

                  const initials =
                    `${account.FirstName?.[0] || ""}${account.LastName?.[0] || ""}`.toUpperCase();

                  return (
                    <tr key={account.UserID}>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="d-flex gap-2">
                            <input
                              className="form-control form-control-sm"
                              value={form.firstName}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  firstName: e.target.value,
                                }))
                              }
                              required
                            />
                            <input
                              className="form-control form-control-sm"
                              value={form.lastName}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  lastName: e.target.value,
                                }))
                              }
                              required
                            />
                          </div>
                        ) : (
                          <div className="d-flex align-items-center gap-3">
                            {/* Avatar */}
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold bg-secondary"
                              style={{
                                width: "38px",
                                height: "38px",
                                fontSize: "0.85rem",
                                backgroundColor: "#6c757d",
                              }}
                            >
                              {initials || "U"}
                            </div>
                            <span className="fw-semibold text-dark">
                              {account.FirstName} {account.LastName}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-secondary fst-italic">
                        {isEditing ? (
                          <input
                            type="email"
                            className="form-control form-control-sm"
                            value={form.email}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            required
                          />
                        ) : (
                          account.Email
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <select
                            className="form-select form-select-sm"
                            value={form.role}
                            disabled={isCurrentUser}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                role: e.target.value,
                              }))
                            }
                          >
                            <option value="Student">Student</option>
                            <option value="Instructor">Instructor</option>
                            <option value="Admin">Admin</option>
                          </select>
                        ) : (
                          <span
                            className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-2 py-1"
                            style={{
                              fontSize: "0.7rem",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {account.Role?.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {isEditing ? (
                          <select
                            className="form-select form-select-sm"
                            value={form.status}
                            disabled={isCurrentUser}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                status: e.target.value,
                              }))
                            }
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        ) : (
                          <span
                            className={`badge px-2 py-1 fw-semibold ${
                              account.Status === "Active"
                                ? "bg-success bg-opacity-10 text-success"
                                : "bg-secondary bg-opacity-10 text-secondary"
                            }`}
                            style={{
                              fontSize: "0.7rem",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {account.Status?.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-muted small">
                        {account.CreatedAt
                          ? new Date(account.CreatedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {isEditing ? (
                          <form
                            onSubmit={saveUser}
                            className="management-form-inline d-flex flex-column gap-2 align-items-end"
                          >
                            <input
                              type="password"
                              className="form-control form-control-sm"
                              placeholder="New password (optional)"
                              minLength={8}
                              value={form.password}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  password: e.target.value,
                                }))
                              }
                              style={{ maxWidth: "200px" }}
                            />
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm text-white fw-semibold px-3"
                                style={{ backgroundColor: "#5640EE" }}
                                disabled={saving}
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={saving}
                                onClick={() => setEditingUserId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="d-flex gap-2 justify-content-end align-items-center">
                            <button
                              type="button"
                              className="btn btn-link text-secondary p-1 text-decoration-none"
                              onClick={() => startEditing(account)}
                              title="Edit"
                              aria-label={`Edit ${account.FirstName} ${account.LastName}`}
                            >
                              <Pencil size={18} strokeWidth={1.8} />
                            </button>
                            {!isCurrentUser && (
                              <button
                                type="button"
                                className="btn btn-link p-1 text-decoration-none"
                                onClick={() =>
                                  changeStatus(
                                    account,
                                    account.Status === "Active"
                                      ? "Inactive"
                                      : "Active",
                                  )
                                }
                                title={
                                  account.Status === "Active"
                                    ? "Deactivate"
                                    : "Reactivate"
                                }
                                aria-label={
                                  account.Status === "Active"
                                    ? `Deactivate ${account.FirstName} ${account.LastName}`
                                    : `Reactivate ${account.FirstName} ${account.LastName}`
                                }
                              >
                                {account.Status === "Active" ? (
                                  <Ban size={18} strokeWidth={1.8} />
                                ) : (
                                  <CircleCheck size={18} strokeWidth={1.8} />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-secondary py-5">
                      {users.length === 0
                        ? "No user accounts found."
                        : "No users match the selected filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
            <span className="text-muted small">
              Showing <strong>{filteredUsers.length}</strong> of{" "}
              <strong>{users.length}</strong> users
            </span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary px-3"
                disabled
              >
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline-primary px-3"
                style={{ borderColor: "#5640EE", color: "#5640EE" }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminUsers;
