# **App Name**: Accountant X SaaS Backend

## Core Features:

- Multi-Tenant Authentication: Secure authentication system supporting SuperAdmin, FirmAdmin, Staff, and ClientUser roles with JWT and role-based access control.
- Firm & Company Management: CRUD APIs for managing firms and companies, ensuring data isolation between firms and linking companies to their respective firms.
- Ledger System: APIs for managing ledgers with groupings (Assets, Liabilities, Income, Expense) and configurations for GST.
- Voucher Engine: Comprehensive voucher system with auto-sequencing, double-entry accounting, audit logs, and balance updates.
- Dynamic Reporting Engine: Report generator allowing date range, party, ledger, and voucher type filters to generate Trial Balance, P&L, and Balance Sheet.
- Invoice Engine with Customization: Generates GST-compliant invoice data with customizable templates for each company.
- Custom Fields Engine: Tool that allows each company to add custom fields to invoices and ledgers stored as a JSON schema.

## Style Guidelines:

- Primary color: Emerald green (#50C878), reminiscent of accounting practices, and also of the 'contact us' call to action buttons shown in the example images.
- Background color: Light emerald green (#E8F8EF) with a desaturated shade to ensure contrast and readability.
- Accent color: Forest green (#228B22) provides contrast and can be used for key interactive elements.
- Body and headline font: 'Inter' for a modern, neutral, and highly readable feel.
- Use sharp, clear icons for key actions (edit, delete, view) to enhance usability.
- Maintain a clean, well-organized layout for data-heavy dashboards and reports. Emphasize key metrics with strategic use of white space and card-based sections.
- Subtle transitions and loading animations to maintain user engagement and communicate system status.