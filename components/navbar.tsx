import Image from "next/image";
import Link from "next/link";


export function Navbar() {
    return (
        <div className="flex items-center justify-between mb-6">
            <Link href={"/"}>
                <Image
                    src="/brand/umai-horizontal.svg"
                    alt="Umai"
                    width={144}
                    height={48}
                    priority
                />
            </Link>
        </div>
    );
}
