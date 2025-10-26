import { tenant } from "@teamhanko/passkeys-next-auth-provider";

// Hanko is optional - only initialize if credentials are provided
let hanko: any = null;

if (process.env.HANKO_API_KEY && process.env.NEXT_PUBLIC_HANKO_TENANT_ID) {
  hanko = tenant({
    apiKey: process.env.HANKO_API_KEY,
    tenantId: process.env.NEXT_PUBLIC_HANKO_TENANT_ID,
  });
}

export default hanko;
