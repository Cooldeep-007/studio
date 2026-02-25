import { FileText, Percent, Truck, Building2, Users, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: <Percent className="h-8 w-8 text-primary" />,
    title: 'GST Return Filing',
    description: 'File GSTR-1, GSTR-3B easily with auto tax calculation and direct GST portal integration.',
  },
  {
    icon: <FileText className="h-8 w-8 text-primary" />,
    title: 'Income Tax Management',
    description: 'Client-wise tracking, ITR filing support, and timely tax reminders to keep you compliant.',
  },
  {
    icon: <Building2 className="h-8 w-8 text-primary" />,
    title: 'Tally & GST Portal Import',
    description: 'Seamlessly import data from Tally or sync with the GST portal. Bulk upload support included.',
  },
  {
    icon: <Truck className="h-8 w-8 text-primary" />,
    title: 'E-Way Bill & E-Invoice Tracking',
    description: 'Generate and track e-way bills effortlessly and monitor the status of your e-invoices.',
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: 'Client Management System',
    description: 'Maintain a separate client database, track filing statuses, and store documents securely.',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'Secure Multi-Device Access',
    description: 'A secure login-based system with an admin dashboard and cross-device synchronization.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">A Feature for Every Need</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            CORNER is packed with powerful features to streamline your accounting and tax compliance, whether you're a CA, SME, or freelancer.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-8 bg-background rounded-2xl border shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex-shrink-0">{feature.icon}</div>
              <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
