import { $ } from "bun"

const stdout = (await $`docker ps -a`.quiet()).text()
const dbContainer = stdout.split("\n").find(line => line.includes("ttm-postgres"));

if (!dbContainer) {
  console.log("Starting new Postgres container...")
  await $`docker run -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=devdb -p 5432:5432 --name ttm-postgres postgres`.quiet()
} else {
  console.log("Starting existing Postgres container...")
  await $`docker start ttm-postgres`.quiet()
}