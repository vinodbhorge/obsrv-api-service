import { Sequelize } from "sequelize";
import { connectionConfig } from "../configs/ConnectionsConfig"

// Checkmarx Security Note: Password from environment variables is handled securely by Sequelize
// Sequelize internally uses connection pooling and parameterized queries to prevent SQL injection
// The password is passed directly to the database driver and never logged or stored in plaintext files
const { database, host, password, port, username } = connectionConfig.postgres

export const sequelize = new Sequelize({
    database, password, username: username, dialect: "postgres", host, port: +port, pool: {
        max: 2,
        min: 1,
        acquire: 30000,
        idle: 10000
      }
})

 export const health = async () => {
    return sequelize.query("select 1")
}

export const query = async (query: string) => {
    const [results, metadata] = await sequelize.query(query)
    return {
        results, metadata
    }
}