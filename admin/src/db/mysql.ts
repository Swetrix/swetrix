import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/user.entity.js";
import { Organisation } from "../entities/organisation.entity.js";
import { OrganisationMember } from "../entities/organisation-member.entity.js";
import { Project } from "../entities/project.entity.js";

let dataSource: DataSource | null = null;

function getDataSource(): DataSource {
  if (!dataSource) {
    dataSource = new DataSource({
      type: "mysql",
      host: process.env.MYSQL_HOST,
      port: 3306,
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_ROOT_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      synchronize: false,
      entities: [User, Organisation, OrganisationMember, Project],
    });
  }
  return dataSource;
}

let initialized = false;

export async function initializeDatabase(): Promise<DataSource> {
  const ds = getDataSource();
  if (!initialized) {
    await ds.initialize();
    initialized = true;
  }
  return ds;
}

export async function testMySQLConnection(): Promise<boolean> {
  try {
    await initializeDatabase();
    return getDataSource().isInitialized;
  } catch {
    return false;
  }
}

// Proxy object that lazily gets the DataSource
export const AppDataSource = new Proxy({} as DataSource, {
  get(_target, prop) {
    const ds = getDataSource();
    const value = ds[prop as keyof DataSource];
    if (typeof value === "function") {
      return value.bind(ds);
    }
    return value;
  },
});

export { User, Organisation, OrganisationMember, Project };
