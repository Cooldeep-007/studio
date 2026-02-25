import { Lock, Fingerprint, DatabaseZap, Server } from 'lucide-react';

const securityFeatures = [
    {
        icon: <Lock className="h-8 w-8 text-primary" />,
        title: 'End-to-End Encryption',
        description: 'Your data is encrypted both in transit and at rest, ensuring it remains private and secure.'
    },
    {
        icon: <Fingerprint className="h-8 w-8 text-primary" />,
        title: 'Role-Based Access Control',
        description: 'Assign specific roles and permissions to your team members, ensuring they only see what they need to.'
    },
    {
        icon: <DatabaseZap className="h-8 w-8 text-primary" />,
        title: 'Secure Cloud Storage',
        description: 'We use industry-leading cloud infrastructure to keep your financial data safe and accessible.'
    },
    {
        icon: <Server className="h-8 w-8 text-primary" />,
        title: 'Daily Backups',
        description: 'Your data is backed up daily, so you never have to worry about losing critical information.'
    }
];

export function SecuritySection() {
  return (
    <section id="security" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">Your Financial Data is Safe with CORNER</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We take security seriously. Our platform is built with multiple layers of protection to keep your sensitive financial information secure.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {securityFeatures.map((feature) => (
            <div key={feature.title} className="flex gap-6 items-start">
              <div className="flex-shrink-0">{feature.icon}</div>
              <div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-1 text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
