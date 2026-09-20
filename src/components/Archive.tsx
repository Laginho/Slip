import { useState } from "react";
import type { CSSProperties } from "react";
import type { Task } from "../store";
import { archive } from "../store";
import { saveConfig } from "../sync";

/**
 * The Archive: every Done Task, kept forever, shown on request at the bottom of the
 * list -- a section, never a route. The store's archive() selector already excludes
 * deleted Tasks and sorts newest first; this file only chooses how much to display.
 *
 * Default view is Done Tasks from the last 7 days (a display choice -- storage keeps
 * everything, there is no retention setting and nothing is ever purged), with a link
 * to reach older ones.
 *
 * Rows are deliberately not Card: an archived Task is a record, not something to act
 * on, so there are no gestures, no hue, no Urgency -- just quiet struck-through text,
 * quieter than anything in the Open list above.
 */

type Props = {
  tasks: Task[];
  now: Date;
  open: boolean;
  onToggle: () => void;
};

export const ARCHIVE_ROW_HEIGHT = 44;

const LINK_ROW: CSSProperties = {
  height: ARCHIVE_ROW_HEIGHT,
  margin: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const LIST: CSSProperties = {
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const LINK: CSSProperties = {
  border: "none",
  background: "none",
  padding: "4px 0",
  color: "var(--text-quiet)",
  fontSize: 14,
  textDecoration: "underline",
  cursor: "pointer",
};

const FIELD: CSSProperties = {
  border: "1px solid var(--hairline)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 16,
  fontFamily: "inherit",
  color: "inherit",
  background: "transparent",
};

const FORM: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "8px 0",
};

/**
 * SLIP-35: BYOK. Collapsed, in the style of the "ver concluídas" link, until
 * clicked; then setup help or the existing credentials form, in place -- no route, no modal.
 * saveConfig() owns the storage key, the URL/privileged-key validation and the
 * both-fields-empty removal; this row only reports what it returned.
 */
function SyncRow() {
  const [expanded, setExpanded] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!expanded) {
    return (
      <p style={LINK_ROW}>
        <button type="button" style={LINK} onClick={() => setExpanded(true)}>
          sincronizar
        </button>
      </p>
    );
  }

  if (!showCredentials) {
    return (
      <div style={FORM}>
        <p style={{ margin: 0, fontSize: 14, textAlign: "center" }}>
          sincronizar é opcional. use seu próprio projeto Supabase para ter a mesma lista em outros dispositivos.
        </p>
        <button type="button" style={{ ...LINK, minHeight: 44 }} onClick={() => setShowCredentials(true)}>
          já tenho um projeto
        </button>
        <a
          href="https://github.com/Laginho/Slip/blob/main/docs/setup.md"
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...LINK, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="preciso configurar (abre o tutorial em outra aba)"
        >
          preciso configurar
        </a>
      </div>
    );
  }

  return (
    <div style={FORM}>
      <button type="button" style={{ ...LINK, minHeight: 44 }} onClick={() => setShowCredentials(false)}>
        voltar
      </button>
      <input
        type="text"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        aria-label="URL do Supabase"
        placeholder="https://<projeto>.supabase.co"
        style={FIELD}
      />
      <input
        type="text"
        value={key}
        onChange={(event) => setKey(event.target.value)}
        aria-label="chave anon do Supabase"
        placeholder="chave publishable/anon"
        style={FIELD}
      />
      <p style={{ margin: 0, display: "flex", justifyContent: "center" }}>
        <button
          type="button"
          style={LINK}
          onClick={() => setError(saveConfig(url.trim(), key.trim()))}
        >
          salvar
        </button>
      </p>
      {error !== null && (
        <p role="alert" style={{ color: "var(--text-quiet)", fontSize: 13, margin: 0, textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Archive({ tasks, now, open, onToggle }: Props) {
  const [allTime, setAllTime] = useState(false);

  const done = archive(tasks);
  // Nothing has ever been finished: the Sync row is the only reason to be here.
  if (done.length === 0) return <SyncRow />;

  if (!open) {
    return (
      <>
        <p style={LINK_ROW}>
          <button type="button" style={LINK} onClick={onToggle}>
            ver concluídas
          </button>
        </p>
        <SyncRow />
      </>
    );
  }

  // "Last 7 days" means seven local calendar dates: today and the six before it.
  // App refreshes `now` at local midnight, so an always-open Archive drops the old
  // seventh day at the boundary without waiting for an unrelated render. Constructing
  // the cutoff by calendar components also survives 23/25-hour DST days.
  const recentSince = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
  ).getTime();
  const recent = done.filter((task) => task.updatedAt >= recentSince);
  const visible = allTime ? done : recent;

  return (
    <>
      <p style={LINK_ROW}>
        <button type="button" style={LINK} onClick={onToggle}>
          ocultar concluídas
        </button>
      </p>

      {visible.length > 0 ? (
        <ul role="list" style={LIST}>
          {visible.map((task) => (
            <li key={task.id} style={{ listStyle: "none", fontSize: 16 }}>
              <span style={{ color: "var(--text-quiet)", textDecoration: "line-through" }}>
                {task.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "var(--text-quiet)", textAlign: "center", margin: 0, fontSize: 14 }}>
          nada concluído nesta semana
        </p>
      )}

      {!allTime && done.length > recent.length && (
        <p style={{ textAlign: "center", margin: "4px 0" }}>
          <button type="button" style={LINK} onClick={() => setAllTime(true)}>
            ver mais antigas
          </button>
        </p>
      )}

      <SyncRow />
    </>
  );
}
