import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/csrf";
import { uploadLimiter } from "@/lib/rate-limit";
import crypto from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(request: NextRequest) {
  const rateLimited = await uploadLimiter.check(request);
  if (rateLimited) return rateLimited;

  if (!validateOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const user = await getSession();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Only PNG, JPEG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { message: "File must be under 5MB" },
        { status: 400 }
      );
    }

    const extMap: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
    const ext = extMap[file.type];

    const filename = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const admin = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate file magic bytes to prevent disguised uploads
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isWebp = buffer.length > 11 && buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP";

    if (!isPng && !isJpeg && !isWebp) {
      return NextResponse.json(
        { message: "File content does not match an image format" },
        { status: 400 }
      );
    }

    const { error: uploadError } = await admin.storage
      .from("proof-screenshots")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { message: "Upload failed" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("proof-screenshots").getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
