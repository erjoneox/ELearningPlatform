import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      setError(
        requestError.response?.data?.message || "Could not load users.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
      title: isDeactivation ? "Deactivate this account?" : "Reactivate account?",
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
          <h1 className="fw-bold mb-1">User management</h1>
          <p className="text-secondary mb-0">
            Admin-only account editing, role management, and access controls.
          </p>
        </div>
        <Link to="/register" className="btn btn-primary">
          Create student or instructor
        </Link>
      </div>

      <div className="alert alert-info">
        Deactivating an account blocks sign-in but preserves its courses,
        submissions, and other learning records.
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={loadUsers}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p role="status">Loading users...</p>
      ) : (
        <div className="table-responsive bg-white rounded shadow-sm">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => {
                const isEditing = editingUserId === account.UserID;
                const isCurrentUser =
                  Number(account.UserID) === Number(currentUser?.userId);

                return (
                  <tr key={account.UserID}>
                    <td>
                      {isEditing ? (
                        <div className="d-flex gap-2">
                          <input
                            className="form-control form-control-sm"
                            aria-label="First name"
                            value={form.firstName}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                firstName: event.target.value,
                              }))
                            }
                            required
                          />
                          <input
                            className="form-control form-control-sm"
                            aria-label="Last name"
                            value={form.lastName}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                lastName: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                      ) : (
                        `${account.FirstName} ${account.LastName}`
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          aria-label="Email"
                          value={form.email}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              email: event.target.value,
                            }))
                          }
                          required
                        />
                      ) : (
                        account.Email
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="form-select form-select-sm"
                          aria-label="Role"
                          value={form.role}
                          disabled={isCurrentUser}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              role: event.target.value,
                            }))
                          }
                        >
                          <option value="Student">Student</option>
                          <option value="Instructor">Instructor</option>
                          <option value="Admin">Admin</option>
                        </select>
                      ) : (
                        account.Role
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="form-select form-select-sm"
                          aria-label="Status"
                          value={form.status}
                          disabled={isCurrentUser}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              status: event.target.value,
                            }))
                          }
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      ) : (
                        <span
                          className={`badge ${account.Status === "Active" ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          {account.Status}
                        </span>
                      )}
                    </td>
                    <td>
                      {account.CreatedAt
                        ? new Date(account.CreatedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      {isEditing ? (
                        <form onSubmit={saveUser} className="d-flex flex-column gap-2">
                          <input
                            type="password"
                            className="form-control form-control-sm"
                            aria-label="New password"
                            placeholder="New password (optional)"
                            minLength={8}
                            autoComplete="new-password"
                            value={form.password}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                password: event.target.value,
                              }))
                            }
                          />
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-primary btn-sm"
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
                        <div className="d-flex gap-2 flex-wrap">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => startEditing(account)}
                          >
                            Edit
                          </button>
                          {!isCurrentUser && (
                            <button
                              type="button"
                              className={`btn btn-sm ${account.Status === "Active" ? "btn-outline-danger" : "btn-outline-success"}`}
                              onClick={() =>
                                changeStatus(
                                  account,
                                  account.Status === "Active"
                                    ? "Inactive"
                                    : "Active",
                                )
                              }
                            >
                              {account.Status === "Active"
                                ? "Deactivate"
                                : "Reactivate"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-secondary py-4">
                    No user accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default AdminUsers;
