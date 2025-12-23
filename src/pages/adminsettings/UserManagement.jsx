import React, { useState } from "react";
import "./UserManagement.css";

const ROLES = ["ADMIN", "RADIOLOGIST", "TECHNICIAN"];

export default function UserManagement() {
  const [users, setUsers] = useState([
    {
      id: 1,
      username: "admin",
      role: "ADMIN",
      active: true,
    },
  ]);

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "RADIOLOGIST",
  });

  const handleAddUser = () => {
    if (!form.username || !form.password) {
      alert("Username & password required");
      return;
    }

    setUsers([
      ...users,
      {
        id: Date.now(),
        username: form.username,
        role: form.role,
        active: true,
      },
    ]);

    setForm({ username: "", password: "", role: "RADIOLOGIST" });
  };

  const toggleStatus = (id) => {
    setUsers(
      users.map((u) =>
        u.id === id ? { ...u, active: !u.active } : u
      )
    );
  };

  return (
    <div className="user-mgmt">
      <h2>User Management</h2>

      {/* CREATE USER */}
      <div className="card">
        <h3>Create User</h3>

        <input
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <button onClick={handleAddUser}>Add User</button>
      </div>

      {/* USERS LIST */}
      <div className="card">
        <h3>Users</h3>

        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.active ? "Active" : "Disabled"}</td>
                <td>
                  <button onClick={() => toggleStatus(u.id)}>
                    {u.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
