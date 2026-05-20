CREATE TABLE "CliAuthCodeRedemption" (
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CliAuthCodeRedemption_pkey" PRIMARY KEY ("codeHash")
);

CREATE INDEX "CliAuthCodeRedemption_expiresAt_idx"
ON "CliAuthCodeRedemption"("expiresAt");

CREATE TABLE "CliTokenRevocation" (
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CliTokenRevocation_pkey" PRIMARY KEY ("tokenHash")
);

CREATE INDEX "CliTokenRevocation_expiresAt_idx"
ON "CliTokenRevocation"("expiresAt");
