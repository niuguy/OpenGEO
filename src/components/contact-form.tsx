"use client";

import { useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setStatus("loading");
    setError("");

    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        agencyName: formData.get("agencyName"),
        message: formData.get("message")
      })
    });

    if (!response.ok) {
      setStatus("error");
      setError("The inquiry could not be saved. Check the fields and try again.");
      return;
    }

    setStatus("success");
  }

  return (
    <form action={submit} className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Name
          <input name="name" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-ink">
          Email
          <input name="email" type="email" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium text-ink">
        Agency
        <input name="agencyName" className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
      </label>
      <label className="mt-4 block text-sm font-medium text-ink">
        What do you want to use this for?
        <textarea
          name="message"
          required
          rows={4}
          className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          defaultValue="I want to test AI visibility audits for local SEO clients."
        />
      </label>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {status === "success" ? <p className="mt-3 text-sm text-accent">Inquiry saved locally.</p> : null}
      <button
        type="submit"
        disabled={status === "loading"}
        className="focus-ring mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {status === "loading" ? "Saving..." : "Send inquiry"}
      </button>
    </form>
  );
}
