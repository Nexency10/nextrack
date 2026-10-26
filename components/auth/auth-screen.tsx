"use client";

import { signInWithIdentifier } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import {
    ArrowRight,
    Eye,
    EyeOff,
    Layers3,
    LockKeyhole,
    Mail,
    ShieldCheck,
    TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type Mode = "signin" | "signup";

export function AuthScreen() {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [mode, setMode] = useState<Mode>("signin");
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{
        text: string;
        error?: boolean;
    } | null>(null);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setMessage(null);
        const data = new FormData(event.currentTarget);
        const identifier = String(data.get("email") ?? "")
            .trim()
            .toLowerCase();
        const password = String(data.get("password") ?? "");

        try {
            if (mode === "signin") {
                const result = await signInWithIdentifier(identifier, password);
                if (result.error) {
                    setMessage({ text: result.error, error: true });
                    return;
                }
                router.replace("/dashboard");
                router.refresh();
                return;
            }

            const supabase = createClient();
            const fullName = String(data.get("name") ?? "").trim();
            const username = String(data.get("username") ?? "")
                .trim()
                .toLowerCase();
            const { data: result, error } = await supabase.auth.signUp({
                email: identifier,
                password,
                options: {
                    data: { full_name: fullName, username },
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                },
            });
            if (error) {
                setMessage({ text: error.message, error: true });
            } else if (result.session) {
                router.replace("/dashboard");
                router.refresh();
                return;
            } else {
                setMessage({
                    text: "Check your email to confirm your account. Your access will be ready after confirmation.",
                });
                setMode("signin");
            }
        } finally {
            formRef.current?.reset();
            setBusy(false);
        }
    }

    const signup = mode === "signup";

    return (
        <main className="min-h-screen bg-[#f3f5fb] p-3 text-[#171a2a] sm:p-6 lg:p-8">
            <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-360 overflow-hidden rounded-[30px] bg-white shadow-[0_28px_100px_rgba(40,45,90,.12)] lg:grid-cols-[1.03fr_.97fr]">
                <section className="relative hidden min-h-190 flex-col overflow-hidden bg-[#17172f] p-12 text-white lg:flex xl:p-18">
                    <div className="absolute -right-36 -top-28 h-120 w-120 rounded-full border border-white/10" />
                    <div className="absolute -right-16 -top-10 h-82.5 w-82.5 rounded-full border border-white/10" />
                    <div className="absolute -bottom-56 -left-28 h-140 w-140 rounded-full bg-[#745af4]/20 blur-[2px]" />
                    <div className="relative flex items-center gap-3 text-[18px] font-semibold tracking-[-.04em]">
                        <span className="grid h-10 w-10 place-items-center rounded-[14px] g-linear-to-br from-[#9d8cff] to-[#6446e8] shadow-lg shadow-violet-950/40">
                            <Layers3 size={21} />
                        </span>
                        nextrack<span className="text-[#9588ff]">.</span>
                    </div>
                    <div className="relative my-auto max-w-135 py-16">
                        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3.5 py-2 text-[11px] font-medium tracking-[.14em] text-[#c2bdff] uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#8c7bff]" />{" "}
                            Sales, made visible
                        </div>
                        <h1 className="text-[46px] leading-[1.1] font-semibold tracking-[-.055em] xl:text-[56px]">
                            Your whole business,
                            <br />
                            in{" "}
                            <span className="bg-linear-to-r from-[#b6aaff] to-[#7e68ff] bg-clip-text text-transparent">
                                one clear view.
                            </span>
                        </h1>
                        <p className="mt-6 max-w-105 text-[15px] leading-7 text-[#a6a7c1]">
                            A calmer way to track orders, understand
                            performance, and keep every account moving forward.
                        </p>
                        <div className="mt-12 rounded-[20px] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/10 backdrop-blur">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-[#aaaac4]">
                                        Revenue overview
                                    </p>
                                    <p className="mt-2 text-[27px] font-semibold tracking-[-.04em]">
                                        $48,290.00
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300">
                                    <TrendingUp size={13} /> 12.8%
                                </div>
                            </div>
                            <div className="mt-7 flex h-23.5 items-end gap-2">
                                {[
                                    26, 39, 33, 56, 45, 66, 52, 74, 59, 88, 71,
                                    96, 79, 100, 84, 92, 74, 105, 89, 112, 97,
                                    120, 101, 132,
                                ].map((height, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            height,
                                            opacity: i > 18 ? 0.9 : 0.55,
                                        }}
                                        className={`flex-1 rounded-t-sm ${i > 18 ? "bg-[#8c79ff]" : "bg-[#615899]"}`}
                                    />
                                ))}
                            </div>
                            <div className="mt-4 flex justify-between text-[10px] text-[#8989a8]">
                                <span>WEEK 01</span>
                                <span>WEEK 02</span>
                                <span>WEEK 03</span>
                                <span>WEEK 04</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative flex items-center gap-2 text-xs text-[#9292ae]">
                        <ShieldCheck size={15} className="text-[#8b7af7]" />{" "}
                        Your workspace, protected at every step
                    </div>
                </section>

                <section className="flex min-h-[calc(100vh-1.5rem)] items-center justify-center px-6 py-12 sm:px-12 lg:min-h-190 lg:px-14 xl:px-20">
                    <div className="w-full max-w-105">
                        <div className="mb-12 flex items-center gap-3 text-[18px] font-semibold tracking-[-.04em] lg:hidden">
                            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-linear-to-br from-[#9d8cff] to-[#6446e8] text-white">
                                <Layers3 size={21} />
                            </span>
                            nextrack<span className="text-[#745af4]">.</span>
                        </div>
                        <div className="mb-8">
                            <p className="mb-3 text-[11px] font-semibold tracking-[.16em] text-[#8173dc] uppercase">
                                {signup ? "Get started" : "Welcome back"}
                            </p>
                            <h2 className="text-[32px] font-semibold tracking-tighter">
                                {signup
                                    ? "Create your account"
                                    : "Sign in to NexTrack"}
                            </h2>
                            <p className="mt-2 text-[14px] leading-6 text-[#85899d]">
                                {signup
                                    ? "Set up your workspace and bring your team together."
                                    : "Pick up where your team left off."}
                            </p>
                        </div>

                        <form ref={formRef} onSubmit={submit} className="space-y-4.25">
                            {signup && (
                                <>
                                    <Field
                                        label="Full name"
                                        name="name"
                                        placeholder="Your name"
                                        autoComplete="name"
                                    />
                                    <Field
                                        label="Username"
                                        name="username"
                                        placeholder="Choose a username"
                                        autoComplete="username"
                                    />
                                </>
                            )}
                            <Field
                                label={
                                    signup
                                        ? "Email address"
                                        : "Username or email"
                                }
                                name="email"
                                type={signup ? "email" : "text"}
                                placeholder={
                                    signup
                                        ? "you@company.com"
                                        : "Enter your username or email"
                                }
                                autoComplete={signup ? "email" : "username"}
                            />
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-[12px] font-semibold text-[#45485c]"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <LockKeyhole
                                        size={16}
                                        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#a2a5b4]"
                                    />
                                    <input
                                        id="password"
                                        name="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        required
                                        minLength={8}
                                        autoComplete={
                                            signup
                                                ? "new-password"
                                                : "current-password"
                                        }
                                        placeholder="At least 8 characters"
                                        className="h-12.5 w-full rounded-[11px] border border-[#e7e8ef] bg-white pr-12 pl-11 text-[13px] outline-none transition placeholder:text-[#b4b6c2] focus:border-[#9585ee] focus:ring-4 focus:ring-[#745af4]/10"
                                    />
                                    <button
                                        type="button"
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute top-1/2 right-4 -translate-y-1/2 text-[#a2a5b4] hover:text-[#55586c]"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={16} />
                                        ) : (
                                            <Eye size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                            {!signup && (
                                <div className="-mt-1 flex justify-end">
                                    <span className="text-[11px] text-[#8073dc]">
                                        Contact your administrator if you need
                                        help signing in.
                                    </span>
                                </div>
                            )}
                            {message && (
                                <p
                                    role="status"
                                    className={`rounded-[10px] px-3.5 py-3 text-[12px] leading-5 ${message.error ? "bg-rose-50 text-rose-700" : "bg-violet-50 text-violet-800"}`}
                                >
                                    {message.text}
                                </p>
                            )}
                            <button
                                disabled={busy}
                                type="submit"
                                className="group flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#7057ed] text-[13px] font-semibold text-white shadow-lg shadow-[#7057ed]/20 transition hover:bg-[#6249df] disabled:opacity-55"
                            >
                                {busy
                                    ? "Please wait…"
                                    : signup
                                      ? "Create account"
                                      : "Sign in"}
                                <ArrowRight
                                    size={16}
                                    className="transition group-hover:translate-x-1"
                                />
                            </button>
                        </form>
                        <p className="mt-7 text-center text-[12px] text-[#85899d]">
                            {signup
                                ? "Already part of a workspace?"
                                : "New to NexTrack?"}{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    formRef.current?.reset();
                                    setMode(signup ? "signin" : "signup");
                                    setMessage(null);
                                }}
                                className="font-semibold text-[#7057ed] hover:text-[#563ed0]"
                            >
                                {signup ? "Sign in" : "Create an account"}
                            </button>
                        </p>
                        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[10px] text-[#aaacb8]">
                            <ShieldCheck size={13} /> Secure authentication
                            powered by Supabase
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}

function Field({
    label,
    name,
    placeholder,
    type = "text",
    autoComplete,
}: {
    label: string;
    name: string;
    placeholder: string;
    type?: string;
    autoComplete?: string;
}) {
    const Icon =
        name === "email" ? Mail : name === "username" ? LockKeyhole : null;
    return (
        <div>
            <label
                htmlFor={name}
                className="mb-2 block text-[12px] font-semibold text-[#45485c]"
            >
                {label}
            </label>
            <div className="relative">
                {Icon && (
                    <Icon
                        size={16}
                        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#a2a5b4]"
                    />
                )}
                <input
                    id={name}
                    name={name}
                    type={type}
                    required
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    className={`h-12.5 w-full rounded-[11px] border border-[#e7e8ef] bg-white pr-4 ${Icon ? "pl-11" : "pl-4"} text-[13px] outline-none transition placeholder:text-[#b4b6c2] focus:border-[#9585ee] focus:ring-4 focus:ring-[#745af4]/10`}
                />
            </div>
        </div>
    );
}

