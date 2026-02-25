import { Briefcase, UserCheck, Building, PenTool } from 'lucide-react';
import { Card } from '@/components/ui/card';

const userTypes = [
  {
    icon: <Briefcase className="h-10 w-10 text-primary" />,
    title: 'CA Firms',
    description: 'Manage multiple clients, track filing statuses, and streamline your practice.',
  },
  {
    icon: <UserCheck className="h-10 w-10 text-primary" />,
    title: 'Tax Consultants',
    description: 'Access all client data in one place for accurate and timely tax advice.',
  },
  {
    icon: <Building className="h-10 w-10 text-primary" />,
    title: 'SMEs',
    description: 'Handle your own accounting, GST, and invoicing without the complexity.',
  },
  {
    icon: <PenTool className="h-10 w-10 text-primary" />,
    title: 'Freelancers',
    description: 'Easily manage your income, expenses, and tax obligations as you grow.',
  },
];

export function WhoItsForSection() {
  return (
    <section id="who-its-for" className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">Built for Professionals Like You</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            CORNER is designed to meet the unique needs of financial professionals and business owners across India.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {userTypes.map((user) => (
            <Card key={user.title} className="text-center p-8 shadow-sm hover:shadow-xl transition-shadow">
              <div className="inline-block p-4 bg-primary/10 rounded-full">
                {user.icon}
              </div>
              <h3 className="mt-6 text-xl font-semibold">{user.title}</h3>
              <p className="mt-2 text-muted-foreground">{user.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
