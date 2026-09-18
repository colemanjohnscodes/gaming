import Link from "next/link";

export function AuthButton() {
  return (
    <Link
      href="/login"
      className="text-cream transition-colors hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
    >
      Leave a name
    </Link>
  );
}
