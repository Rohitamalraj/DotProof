"use client";
import { useState } from "react";
import { Reveal } from "../Reveal";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="wrap-wide mt-6">
      <Reveal className="card-light mx-5 px-6 py-12 text-center">
        <h3 className="text-[22px] font-medium tracking-[-0.03em]">Follow the build</h3>
        <p className="mt-2 text-[17px] text-fg-2">Be the first to hear about testnet launches and agent drops.</p>
        <form
          className="mx-auto mt-6 flex max-w-md items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.includes("@")) setDone(true); // placeholder: no backend yet
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            className="h-11 flex-1 rounded-full bg-bg-4 px-5 text-[15px] outline-none placeholder:text-fg-4 focus:ring-2 focus:ring-purple-6"
          />
          <button className={`btn h-11 ${email.includes("@") ? "btn-dark" : "bg-fg-3 text-white"}`}>{done ? "Subscribed" : "Notify Me"}</button>
        </form>
      </Reveal>
    </section>
  );
}
