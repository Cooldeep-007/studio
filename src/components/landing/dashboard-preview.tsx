import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function DashboardPreviewSection() {
    const dashboardImage = PlaceHolderImages.find(img => img.id === 'dashboard-mockup');

    return (
        <section className="py-20 bg-secondary/30">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold">
                            Everything You Need in One Powerful Dashboard
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Gain a complete overview of your firm's financial health. Track revenue, monitor tax liabilities, and manage compliance from a single, intuitive interface.
                        </p>
                        <ul className="mt-8 space-y-4">
                            <li className="flex items-center gap-3">
                                <CheckCircle className="h-6 w-6 text-accent" />
                                <span className="text-base text-muted-foreground">Visualize revenue trends with interactive charts.</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle className="h-6 w-6 text-accent" />
                                <span className="text-base text-muted-foreground">Get real-time GST payable summaries.</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle className="h-6 w-6 text-accent" />
                                <span className="text-base text-muted-foreground">Stay on top of pending filings and due dates.</span>
                            </li>
                        </ul>
                         <div className="mt-8">
                            <Button size="lg" asChild>
                                <Link href="/signup">Explore the Dashboard</Link>
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        {dashboardImage && (
                            <Image
                                src={dashboardImage.imageUrl}
                                alt="CORNER Dashboard"
                                width={1000}
                                height={700}
                                className="rounded-xl border shadow-2xl shadow-primary/10"
                                data-ai-hint={dashboardImage.imageHint}
                            />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
