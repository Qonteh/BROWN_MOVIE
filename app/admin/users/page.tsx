"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  Plus,
  CheckCheck,
  Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuthToken } from "@/lib/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AdminUser = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  purchases: number
  joined: string
  status: "active" | "inactive"
}

const PROTECTED_EMAIL = "abdulyusuph051@gmail.com"

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "user",
    isActive: true,
  })

  const [editForm, setEditForm] = useState({
    fullName: "",
    phoneNumber: "",
    role: "user",
    isActive: true,
  })

  const fetchUsers = async () => {
    setIsLoading(true)

    try {
      const token = getAuthToken()
      if (!token) {
        setError("No auth token found. Please login again.")
        setUsers([])
        return
      }

      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: "Failed to fetch users" }))
        throw new Error(result.error || "Failed to fetch users")
      }

      const result = await response.json()
      const nextUsers = result.users ?? []
      setUsers(nextUsers)
      const nextUserIds = new Set(nextUsers.map((user: AdminUser) => user.id))
      setSelectedUserIds((prev) => prev.filter((id) => nextUserIds.has(id)))
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch users"
      setError(message)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone ?? "").includes(searchQuery),
      ),
    [users, searchQuery],
  )

  const isProtectedUser = (user: AdminUser) => user.email.toLowerCase() === PROTECTED_EMAIL

  const selectableFilteredUsers = filteredUsers.filter((user) => !isProtectedUser(user))
  const selectableFilteredUserIds = selectableFilteredUsers.map((user) => user.id)
  const allSelectableFilteredSelected =
    selectableFilteredUserIds.length > 0 &&
    selectableFilteredUserIds.every((id) => selectedUserIds.includes(id))

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const toggleSelectAllFiltered = () => {
    if (allSelectableFilteredSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !selectableFilteredUserIds.includes(id)))
      return
    }

    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...selectableFilteredUserIds])))
  }

  const openEdit = (user: AdminUser) => {
    setEditingUserId(user.id)
    setEditForm({
      fullName: user.name,
      phoneNumber: user.phone || "",
      role: user.role === "admin" ? "admin" : "user",
      isActive: user.status === "active",
    })
    setIsEditOpen(true)
  }

  const createUser = async () => {
    if (submitting) return

    try {
      setSubmitting(true)
      setError(null)

      const token = getAuthToken()
      if (!token) throw new Error("No auth token found. Please login again.")

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createForm),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create user")
      }

      setIsCreateOpen(false)
      setCreateForm({
        fullName: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "user",
        isActive: true,
      })
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setSubmitting(false)
    }
  }

  const saveEdit = async () => {
    if (!editingUserId || submitting) return

    try {
      setSubmitting(true)
      setError(null)

      const token = getAuthToken()
      if (!token) throw new Error("No auth token found. Please login again.")

      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update user")
      }

      setIsEditOpen(false)
      setEditingUserId(null)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user")
    } finally {
      setSubmitting(false)
    }
  }

  const deleteUser = async (user: AdminUser) => {
    const confirmed = window.confirm(`Delete user \"${user.name}\"?`)
    if (!confirmed) return

    try {
      setError(null)

      const token = getAuthToken()
      if (!token) throw new Error("No auth token found. Please login again.")

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete user")
      }

      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
    }
  }

  const runBulkAction = async (action: "activate" | "deactivate") => {
    if (bulkLoading || selectedUserIds.length === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${selectedUserIds.length} selected user(s)?`,
    )
    if (!confirmed) return

    try {
      setBulkLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) throw new Error("No auth token found. Please login again.")

      const response = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ids: selectedUserIds }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Bulk action failed")
      }

      setSelectedUserIds([])
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed")
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) {
            setCreateForm({
              fullName: "",
              email: "",
              phoneNumber: "",
              password: "",
              role: "user",
              isActive: true,
            })
          }
        }}
      >
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add User</DialogTitle>
            <DialogDescription>Create a new platform user or admin.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <input
              type="text"
              placeholder="Full name"
              value={createForm.fullName}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground"
            />
            <input
              type="email"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground"
            />
            <input
              type="text"
              placeholder="Phone number (optional)"
              value={createForm.phoneNumber}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground"
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={createForm.password}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground"
            />
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
              className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={createForm.isActive ? "active" : "inactive"}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}
              className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button className="btn-gradient text-white" onClick={createUser} disabled={submitting}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) {
            setEditingUserId(null)
          }
        }}
      >
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit User</DialogTitle>
            <DialogDescription>Update user role and profile status.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <input
              type="text"
              placeholder="Full name"
              value={editForm.fullName}
              onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground"
            />
            <input
              type="text"
              placeholder="Phone number"
              value={editForm.phoneNumber}
              onChange={(e) => setEditForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              className="w-full px-4 py-2 bg-secondary rounded-lg text-foreground"
            />
            <select
              value={editForm.role}
              onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
              className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={editForm.isActive ? "active" : "inactive"}
              onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}
              className="w-full rounded-lg border-0 bg-secondary px-4 py-2 text-foreground"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={submitting}>Cancel</Button>
            <Button className="btn-gradient text-white" onClick={saveEdit} disabled={submitting}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">Manage platform users and administrators</p>
        </div>
        <Button className="btn-gradient text-white" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green/10">
              <ShieldCheck className="w-6 h-6 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.filter((u) => u.status === "active").length}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue/10">
              <Shield className="w-6 h-6 text-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.filter((u) => u.role === "admin").length}</p>
              <p className="text-sm text-muted-foreground">Administrators</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="bg-card border-border overflow-hidden">
        <CardHeader>
          <CardTitle className="text-foreground">All Users ({filteredUsers.length})</CardTitle>
          {selectedUserIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2.5">
              <span className="text-sm text-foreground">{selectedUserIds.length} selected</span>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => runBulkAction("activate")}
                disabled={bulkLoading}
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => runBulkAction("deactivate")}
                disabled={bulkLoading}
              >
                <Ban className="w-4 h-4 mr-1" />
                Deactivate
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={allSelectableFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      aria-label="Select all filtered users"
                      className="h-4 w-4 rounded border-border bg-secondary"
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Purchases</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      Loading real users...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : null}

                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      {isProtectedUser(user) ? null : (
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          aria-label={`Select ${user.name}`}
                          className="h-4 w-4 rounded border-border bg-secondary"
                        />
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="text-sm text-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.phone || "N/A"}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === "admin" ? "bg-blue/10 text-blue" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-foreground">{user.purchases}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.joined).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.status === "active" ? "bg-green/10 text-green" : "bg-red/10 text-red"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {isProtectedUser(user) ? null : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" type="button">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => deleteUser(user)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
