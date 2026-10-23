import { PageHeader } from "@/components/ui";
import { agents, rolePermissions, activity } from "@/lib/placeholder";

export const metadata = { title: "Agents · DotProof" };

const roleColor: Record<string, string> = {
  Sentinel: "bg-purple-8 text-primary-strong",
  Keeper: "bg-[#e6f9ec] text-ok-strong",
  Guardian: "bg-[#fff6d6] text-[#9a7400]",
};

export default function AgentsPage() {
  return (
    <>
      <PageHeader eyebrow="Agent network" title="Autonomous, bonded, and limited" sub="Each agent has its own wallet, a registered identity, role-limited permissions enforced by contracts, and a slashable bond." />
      <section className="wrap-wide mt-10 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {rolePermissions.map((r) => (
            <div key={r.role} className="card-light p-6">
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${roleColor[r.role]}`}>{r.role}</span>
              <p className="mt-4 min-h-[60px] text-[14px] leading-5 text-fg-2">{r.job}</p>
              <dl className="mt-4 space-y-3 text-[13px]">
                <div><dt className="text-ok-strong font-medium">Can</dt><dd className="text-fg-2">{r.can}</dd></div>
                <div><dt className="text-danger font-medium">Cannot</dt><dd className="text-fg-2">{r.cannot}</dd></div>
                <div><dt className="font-medium text-fg-1">Loses bond if</dt><dd className="text-fg-2">{r.slashed}</dd></div>
              </dl>
            </div>
          ))}
        </div>

        <div className="card-light overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line-1 text-[12px] font-medium text-fg-3">
                {["Agent", "Role", "Wallet", "Bond", "Rewards", "Slashes", "Actions", "Status"].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b border-line-1 text-[14px] last:border-0">
                  <td className="px-5 py-4 font-medium">{a.id}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${roleColor[a.role]}`}>{a.role}</span></td>
                  <td className="px-5 py-4 font-mono text-[13px] text-fg-2">{a.address}</td>
                  <td className="px-5 py-4">{a.bond}</td>
                  <td className="px-5 py-4">{a.reward}</td>
                  <td className="px-5 py-4">{a.slashes}</td>
                  <td className="px-5 py-4">{a.actions}</td>
                  <td className="px-5 py-4 text-fg-2"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${a.status === "Online" ? "bg-ok" : "bg-fg-4"}`} />{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-light p-8">
          <h3 className="text-[17px] font-medium tracking-[-0.02em]">Activity feed</h3>
          <ul className="mt-4 divide-y divide-line-1">
            {activity.map((a) => (
              <li key={a.hash} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5 text-[14px]">
                <span className={`h-2 w-2 rounded-full ${a.tone === "ok" ? "bg-ok" : "bg-danger"}`} />
                <span className="w-24 text-[13px] text-fg-3">{a.t}</span>
                <span className="w-28 font-medium">{a.who}</span>
                <span className="flex-1 text-fg-2">{a.what}</span>
                <span className="font-mono text-[12px] text-primary-strong">{a.hash}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[20px] bg-bg-4 p-6 text-[14px] leading-6 text-fg-2">
          <strong className="text-fg-1">Honest note.</strong> Agents are rule-based by default. An LLM may assist the Sentinel on borderline cases and logs its
          reasoning, but never has authority over safety-critical paths. Cross-chain attestation remains a documented, bonded trust assumption.
        </div>
      </section>
    </>
  );
}
