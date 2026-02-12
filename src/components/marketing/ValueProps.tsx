const ValueProps = () => {
  const items = [
    {
      title: "Live turn + ETA range",
      body: "Patients see their live number and an ETA range before they arrive.",
    },
    {
      title: "Handles real-world flow",
      body: "Urgent inserts, pauses, late arrivals, and missed visits stay fair.",
    },
    {
      title: "Works with any booking source",
      body: "Phone, walk-in, or partner bookings - everything stays in one queue.",
    },
    {
      title: "Simple for secretaries",
      body: "One screen to admit, call, and close out the day without chaos.",
    },
  ];

  return (
    <section className="bg-background">
      <div className="container mx-auto grid gap-4 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ValueProps;
