import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";

export default function ShoppingPage() {
    return (
        <PageTransition>
            <PageHeader eyebrow="Nákupní seznam" title="Nákup" />
            <div className="text-center py-14 px-3 text-rice-dim">
                <h2 className="font-serif text-rice text-[1.5625rem] mb-1.5">Připravujeme</h2>
                <p>Brzy sem přidáš recepty a suroviny z nich si při nákupu odškrtáš.</p>
            </div>
        </PageTransition>
    );
}
