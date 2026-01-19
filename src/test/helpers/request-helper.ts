import { request } from "../../lib/request"
import { defaultPassword, defaultUser } from "./test-constants"

export const authenticate = async (email = defaultUser.email, password = defaultPassword, playerId?: string, inviteToken?: string) => {
  const data = await request({
    path: `/api/auth/login/credentials`,
    method: "POST",
    body: { email, password, playerId, inviteToken }
  })

  return data as { data: { jwt: string } };
}

export const authenticatePlayer = async (playerId: string, inviteToken: string) => {
  const data = await request({
    path: `/api/auth/team/join`,
    method: "POST",
    body: { playerId, inviteToken }
  })

  return data as { data: { jwt: string } };
}
