import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <h1 className="font-serif text-3xl text-cream">This room is closed.</h1>
      <Link
        href="/"
        className="mt-8 text-sm tracking-[0.16em] text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        The Parlor
      </Link>
    </div>
  );
}
