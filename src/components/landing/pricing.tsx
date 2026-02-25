import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
    {
        name: 'Starter',
        price: '₹999',
        pricePeriod: '/month',
        description: 'For freelancers and small businesses just getting started.',
        features: [
            'Up to 500 Vouchers/month',
            'GST Filing (GSTR-1, 3B)',
            'Client Management (5 clients)',
            'Basic Reporting',
            'Email Support'
        ],
        cta: 'Start with Starter',
        isPopular: false
    },
    {
        name: 'Professional',
        price: '₹2499',
        pricePeriod: '/month',
        description: 'For growing firms and tax consultants.',
        features: [
            'Up to 2000 Vouchers/month',
            'GST & Income Tax Filing',
            'Client Management (50 clients)',
            'Advanced Reporting',
            'Tally & GST Portal Import',
            'Priority Email & Chat Support'
        ],
        cta: 'Choose Professional',
        isPopular: true
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        pricePeriod: '',
        description: 'For large firms with custom needs and high volume.',
        features: [
            'Unlimited Vouchers',
            'All Professional Features',
            'Multi-user Roles & Permissions',
            'API Access',
            'Dedicated Account Manager',
            'Onboarding & Training'
        ],
        cta: 'Contact Sales',
        isPopular: false
    }
]

export function PricingSection() {
    return (
        <section id="pricing" className="py-20 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold">Simple, Transparent Pricing</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Choose the plan that fits your business. No hidden fees, no surprises.
                    </p>
                </div>

                <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
                    {plans.map((plan) => (
                        <Card key={plan.name} className={`flex flex-col h-full ${plan.isPopular ? 'border-primary border-2 shadow-xl' : 'shadow-sm'}`}>
                            {plan.isPopular && (
                                <div className="bg-primary text-primary-foreground text-center py-1.5 text-sm font-semibold rounded-t-lg">
                                    Most Popular
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                                <div className="pt-4">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    {plan.pricePeriod && <span className="text-muted-foreground">{plan.pricePeriod}</span>}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <ul className="space-y-4">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <Check className="h-5 w-5 text-accent" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button asChild className="w-full" variant={plan.isPopular ? 'default' : 'outline'}>
                                    <Link href={plan.name === 'Enterprise' ? '#contact' : '/signup'}>
                                        {plan.cta}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}
