import { Card, CardContent } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";

const testimonials = [
  {
    id: 1,
    name: 'Ravi Sharma',
    title: 'Chartered Accountant',
    avatarId: 'testimonial-avatar-1',
    text: 'CORNER has transformed my practice. Managing multiple clients, tracking GST filings, and generating reports is now incredibly efficient. It has saved me countless hours every month.',
  },
  {
    id: 2,
    name: 'Priya Singh',
    title: 'Small Business Owner',
    avatarId: 'testimonial-avatar-2',
    text: 'As a non-accountant, I was always intimidated by tax software. CORNER is so intuitive and easy to use. I can finally handle my own invoicing and GST returns with confidence.',
  },
  {
    id: 3,
    name: 'Amit Patel',
    title: 'Tax Consultant',
    avatarId: 'testimonial-avatar-3',
    text: 'The Tally import and GST portal sync features are game-changers. The platform is robust, secure, and has all the features a modern tax professional needs.',
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">Trusted by Professionals Across India</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Hear what our customers have to say about simplifying their financial workflow with CORNER.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => {
            const avatar = PlaceHolderImages.find(img => img.id === testimonial.avatarId);
            return (
              <Card key={testimonial.id} className="p-8 shadow-sm">
                <CardContent className="p-0">
                  <p className="text-muted-foreground">"{testimonial.text}"</p>
                  <div className="mt-6 flex items-center gap-4">
                    {avatar && (
                      <Image
                        src={avatar.imageUrl}
                        alt={testimonial.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                        data-ai-hint={avatar.imageHint}
                      />
                    )}
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
