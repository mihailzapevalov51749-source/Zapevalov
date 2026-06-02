import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readBackendSource(relativePath) {
  return readFileSync(
    join(__dirname, "..", "..", "..", "backend", "app", relativePath),
    "utf8",
  );
}

describe("yasii memory pipeline wiring", () => {
  it("keeps embedded query path and passes tenant/user identity to runtime", () => {
    const apiSource = readFileSync(join(__dirname, "yasiiEmbeddedApi.js"), "utf8");
    const hostSource = readFileSync(join(__dirname, "hostContextBuilders.js"), "utf8");
    const runtimeSource = readBackendSource("modules/yasii/runtime_orchestrator.py");
    const userAnswersSource = readBackendSource("modules/yasii/user_memory_answers.py");
    const tenantAnswersSource = readBackendSource("modules/yasii/tenant_memory_answers.py");
    const sessionAnswersSource = readBackendSource("modules/yasii/session_memory_answers.py");
    const decisionAnswersSource = readBackendSource("modules/yasii/decision_memory_answers.py");
    const decisionStoreSource = readBackendSource("modules/yasii/decision_memory_store.py");
    const processMemorySource = readBackendSource("modules/yasii/process_memory.py");
    const memoryGraphSource = readBackendSource("modules/yasii/memory_graph.py");
    const runtimeDemoSource = readBackendSource("modules/yasii/runtime_demo_service.py");
    const handoffSource = readBackendSource("modules/ai_context/handoff.py");

    assert.match(apiSource, /sendEmbeddedQuery/);
    assert.match(hostSource, /userId/);
    assert.match(hostSource, /tenantId/);
    assert.match(runtimeSource, /"userId": handoff\.userId/);
    assert.match(runtimeSource, /"tenantId": handoff\.tenantId/);
    assert.match(runtimeSource, /"sessionId": handoff\.sessionId/);
    assert.match(handoffSource, /sessionId/);
    assert.match(userAnswersSource, /Запомни/);
    assert.match(userAnswersSource, /Информация сохранена в памяти/);
    assert.match(tenantAnswersSource, /Запомни для компании/);
    assert.match(tenantAnswersSource, /Информация сохранена в памяти компании/);
    assert.match(runtimeDemoSource, /tenant_memory_message/);
    assert.match(runtimeDemoSource, /resolve_tenant_memory_command/);
    assert.match(sessionAnswersSource, /CONTEXT_COMMAND_KEYWORDS/);
    assert.match(sessionAnswersSource, /resolve_session_memory_command/);
    assert.match(runtimeDemoSource, /resolve_session_memory_command/);
    assert.match(runtimeDemoSource, /SESSION_MEMORY_UPDATED/);
    assert.match(decisionAnswersSource, /Запомни решение/);
    assert.match(decisionAnswersSource, /detect_decision_conflict/);
    assert.match(decisionStoreSource, /противоречит/);
    assert.match(runtimeDemoSource, /resolve_decision_memory_command/);
    assert.match(runtimeDemoSource, /decision_memory_message/);
    assert.match(runtimeDemoSource, /DECISION_CONFLICT_DETECTED/);
    assert.match(processMemorySource, /ProcessDefinitionSnapshot/);
    assert.match(processMemorySource, /SchemaOnlyProcessMemoryRepository/);
    assert.match(runtimeDemoSource, /load_process_memory/);
    assert.match(runtimeDemoSource, /PROCESS_MEMORY_LOADED/);
    assert.match(memoryGraphSource, /MemoryGraphSnapshot/);
    assert.match(memoryGraphSource, /sync_decision_graph_links/);
    assert.match(runtimeDemoSource, /resolve_memory_graph_command/);
    assert.match(runtimeDemoSource, /MEMORY_GRAPH_LOADED/);
  });
});
