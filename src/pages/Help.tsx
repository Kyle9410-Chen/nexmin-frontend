import FeatureGuide from "@/components/help/FeatureGuide";

export default function Help() {
  return (
    // Narrower than the table pages: this one is prose.
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <FeatureGuide />
    </div>
  );
}
