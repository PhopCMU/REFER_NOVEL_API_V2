import jwt from "@elysiajs/jwt";

export const vetJwt = jwt({
  name: "vetJwt",
  secret: process.env.JWT_SECRET! as string,
  alg: "HS256",
  iss: process.env.JWT_ISS! as string,
  aud: "vet",
  exp: "7d",
});

export const adminJwt = jwt({
  name: "adminJwt",
  secret: process.env.JWT_SECRET! as string,
  alg: "HS256",
  iss: process.env.JWT_ISS! as string,
  aud: "admin",
  exp: "7d",
});

export const vetCmuJwt = jwt({
  name: "vetCmuJwt",
  secret: process.env.JWT_SECRET! as string,
  alg: "HS256",
  iss: process.env.JWT_ISS! as string,
  aud: "vet-cmu",
  exp: "7d",
});
