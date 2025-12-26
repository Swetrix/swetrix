import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import { Spinner } from "./Spinner.js";
import { OrgsCommand } from "../commands/OrgsCommand.js";
import { ProjectsCommand } from "../commands/ProjectsCommand.js";
import { UsersCommand } from "../commands/UsersCommand.js";
import { StatsCommand } from "../commands/StatsCommand.js";
import { initializeDatabase, testMySQLConnection } from "../db/mysql.js";
import { testClickHouseConnection } from "../db/clickhouse.js";

type View = "menu" | "orgs" | "projects" | "users" | "stats";

const menuItems = [
  { label: "📊 ClickHouse Stats", value: "stats" as const },
  { label: "🏢 Organizations", value: "orgs" as const },
  { label: "📁 Projects", value: "projects" as const },
  { label: "👥 Users", value: "users" as const },
  { label: "❌ Exit", value: "exit" as const },
];

export function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>("menu");
  const [loading, setLoading] = useState(true);
  const [mysqlConnected, setMysqlConnected] = useState(false);
  const [clickhouseConnected, setClickhouseConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Test connections in parallel
        const [mysqlOk, chOk] = await Promise.all([
          testMySQLConnection(),
          testClickHouseConnection(),
        ]);

        setMysqlConnected(mysqlOk);
        setClickhouseConnected(chOk);

        if (mysqlOk) {
          await initializeDatabase();
        }

        if (!mysqlOk && !chOk) {
          setError(
            "Could not connect to any database. Check your .env configuration."
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useInput((input, key) => {
    if (key.escape || (input === "q" && view !== "menu")) {
      if (view === "menu") {
        exit();
      } else {
        setView("menu");
      }
    }
  });

  const handleSelect = (item: { value: string }) => {
    if (item.value === "exit") {
      exit();
      return;
    }
    setView(item.value as View);
  };

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Swetrix Admin CLI
        </Text>
        <Box marginTop={1}>
          <Spinner text="Connecting to databases..." />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">
          Error
        </Text>
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Text color="gray">
            Make sure you have a .env file in the backend directory with the
            correct database credentials.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🔧 Swetrix Admin CLI
        </Text>
      </Box>

      {/* Connection status */}
      <Box marginBottom={1} flexDirection="column">
        <Text>
          <Text color={mysqlConnected ? "green" : "red"}>
            {mysqlConnected ? "●" : "○"}
          </Text>
          {" MySQL: "}
          <Text color={mysqlConnected ? "green" : "red"}>
            {mysqlConnected ? "Connected" : "Disconnected"}
          </Text>
        </Text>
        <Text>
          <Text color={clickhouseConnected ? "green" : "red"}>
            {clickhouseConnected ? "●" : "○"}
          </Text>
          {" ClickHouse: "}
          <Text color={clickhouseConnected ? "green" : "red"}>
            {clickhouseConnected ? "Connected" : "Disconnected"}
          </Text>
        </Text>
      </Box>

      {view === "menu" && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">Select an option:</Text>
          </Box>
          <SelectInput items={menuItems} onSelect={handleSelect} />
        </Box>
      )}

      {view === "orgs" && <OrgsCommand onBack={() => setView("menu")} />}
      {view === "projects" && (
        <ProjectsCommand onBack={() => setView("menu")} />
      )}
      {view === "users" && <UsersCommand onBack={() => setView("menu")} />}
      {view === "stats" && <StatsCommand onBack={() => setView("menu")} />}

      {view !== "menu" && (
        <Box marginTop={1}>
          <Text color="gray">Press ESC or Q to go back</Text>
        </Box>
      )}
    </Box>
  );
}
