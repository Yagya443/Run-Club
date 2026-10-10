import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { errorMessage } from "../lib/api.js";

export default function Auth({ mode }) {
    const isReg = mode === "register";
    const { user, login, register } = useAuth();
    const nav = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    if (user) return <Navigate to="/home" replace />;
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    async function submit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await (isReg
                ? register(form)
                : login({ email: form.email, password: form.password }));
            nav("/home");
        } catch (err) {
            const f = err?.response?.data?.fields;
            setError(f ? Object.values(f).flat().join(" ") : errorMessage(err));
        } finally {
            setBusy(false);
        }
    }
    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-sm px-4 py-12">
                <h1 className="text-3xl font-bold">
                    {isReg ? "Join Run Club" : "Welcome back"}
                </h1>
                <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                    {isReg && (
                        <label className="block text-sm font-medium">
                            Name
                            <input
                                className="field mt-1"
                                value={form.name}
                                onChange={set("name")}
                                autoComplete="name"
                                required
                            />
                        </label>
                    )}
                    <label className="block text-sm font-medium">
                        Email
                        <input
                            type="email"
                            className="field mt-1"
                            value={form.email}
                            onChange={set("email")}
                            autoComplete="email"
                            required
                        />
                    </label>
                    <label className="block text-sm font-medium">
                        Password
                        <input
                            type="password"
                            className="field mt-1"
                            value={form.password}
                            onChange={set("password")}
                            autoComplete={
                                isReg ? "new-password" : "current-password"
                            }
                            required
                        />
                    </label>
                    {error && (
                        <p
                            role="alert"
                            className="rounded-lg bg-ember/10 p-3 text-sm text-ink"
                        >
                            {error}
                        </p>
                    )}
                    <button className="btn-primary w-full" disabled={busy}>
                        {busy
                            ? "One moment…"
                            : isReg
                              ? "Create account"
                              : "Sign in"}
                    </button>
                </form>
                <p className="mt-6 text-sm text-stone">
                    {isReg ? "Already a member?" : "New here?"}{" "}
                    <Link
                        className="font-semibold text-forest underline"
                        to={isReg ? "/login" : "/register"}
                    >
                        {isReg ? "Sign in" : "Create an account"}
                    </Link>
                </p>
            </main>
        </>
    );
}
