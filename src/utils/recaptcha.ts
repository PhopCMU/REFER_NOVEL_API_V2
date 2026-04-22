interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  error_codes?: string[];
}

export async function verifyRecaptcha(
  token: string,
  action: string,
  minScore = 0.5,
) {
  if (!token) {
    return { success: false, message: "Missing token" };
  }

  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    throw new Error("RECAPTCHA_SECRET not found");
  }

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret,
      response: token,
    }),
  });

  const data: RecaptchaResponse = await res.json();

  if (!data.success) {
    return {
      success: false,
      message: "Verification failed",
      errors: data.error_codes,
    };
  }

  // score check
  if (typeof data.score === "number" && data.score < minScore) {
    return {
      success: false,
      message: "Low score",
      score: data.score,
    };
  }

  // action check (สำคัญมากใน v3)
  if (action && data.action !== action) {
    return {
      success: false,
      message: "Invalid action",
      expected: action,
      received: data.action,
    };
  }

  return {
    success: true,
    score: data.score,
    action: data.action,
  };
}
