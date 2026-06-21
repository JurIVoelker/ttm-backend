import { $ } from "bun"

try {
  await $`docker info`.quiet()
} catch {
  console.error("Docker is not running. Please start Docker and try again.")
  process.exit(1)
}

const stdout = (await $`docker ps -a`.quiet()).text()
const dbContainer = stdout.split("\n").find(line => line.includes("ttm-postgres"));

if (!dbContainer) {
  console.log("Starting new Postgres container...")
  await $`docker run -d -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=devdb -p 60000:5432 --name ttm-postgres postgres`.quiet()
} else {
  console.log("Starting existing Postgres container...")
  await $`docker start ttm-postgres`.quiet()
}

console.log("Waiting for Postgres to be ready...")
const maxAttempts = 30
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    await $`docker exec ttm-postgres pg_isready -U postgres -d devdb`.quiet()
    console.log("Database is ready!")
    break
  } catch {
    if (attempt === maxAttempts) {
      console.error("Postgres did not become ready in time.")
      process.exit(1)
    }
    await Bun.sleep(1000)
  }
}