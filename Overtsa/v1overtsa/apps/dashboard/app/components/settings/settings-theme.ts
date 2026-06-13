"use client";

export function getSettingsThemeClasses() {
  return [
    "text-[#171717]",
    "[&_.settings-card]:!border-[#e7e0dc] [&_.settings-card]:!bg-white",
    "[&_.settings-subtle]:!border-[#e7e0dc] [&_.settings-subtle]:!bg-[#fbfaf9]",
    "[&_.settings-input]:!border-[#e7e0dc] [&_.settings-input]:!bg-white [&_.settings-input]:!text-[#171717] [&_.settings-input]:placeholder:!text-[#a39a96]",
    "[&_.settings-heading]:!text-[#171717]",
    "[&_.settings-copy]:!text-[#6f6966]",
    "[&_.settings-label]:!text-[#5f5956]",
    "[&_.settings-kicker]:!text-[#8f8783]",
    "[&_.settings-icon]:!bg-[#171717] [&_.settings-icon]:!text-white",
    "[&_.settings-chip]:!border-[#e7e0dc] [&_.settings-chip]:!bg-[#fbfaf9] [&_.settings-chip]:!text-[#5f5956]",
    "[&_.settings-button]:!border-[#e7e0dc] [&_.settings-button]:!bg-white [&_.settings-button]:!text-[#5f5956] hover:[&_.settings-button]:!bg-[#fbfaf9]",
    "[&_.settings-primary]:!bg-[#171717] [&_.settings-primary]:!text-white hover:[&_.settings-primary]:!bg-black",
    "[&_.settings-divider]:!border-[#e7e0dc]",
    "[&_.settings-row]:!border-[#ece6e3]",
    "[&_.settings-table-head]:!bg-[#fbfaf9] [&_.settings-table-head]:!text-[#8f8783]",
    "[&_.settings-link]:!text-[#5f5956]"
  ].join(" ");
}
