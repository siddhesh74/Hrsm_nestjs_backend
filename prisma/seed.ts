import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hrms.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@hrms.com',
      password: adminPassword,
      role: Role.admin,
      department: 'Administration',
      dateOfJoining: new Date('2024-01-01'),
      salary: 80000,
      leaveBalance: 10,
    },
  });

  // Create sample employees
  const employees = [
    {
      name: 'John Doe',
      email: 'john.doe@hrms.com',
      department: 'Engineering',
      salary: 60000,
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@hrms.com',
      department: 'Engineering',
      salary: 65000,
    },
    {
      name: 'Mike Johnson',
      email: 'mike.johnson@hrms.com',
      department: 'Marketing',
      salary: 55000,
    },
    {
      name: 'Sarah Wilson',
      email: 'sarah.wilson@hrms.com',
      department: 'HR',
      salary: 58000,
    },
    {
      name: 'David Brown',
      email: 'david.brown@hrms.com',
      department: 'Finance',
      salary: 62000,
    },
  ];

  const employeePassword = await bcrypt.hash('employee123', 12);

  for (const emp of employees) {
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        name: emp.name,
        email: emp.email,
        password: employeePassword,
        role: Role.employee,
        department: emp.department,
        dateOfJoining: new Date('2024-01-15'),
        salary: emp.salary,
        leaveBalance: 5,
      },
    });
  }

  console.log('Database seeded successfully!');
  console.log('Admin credentials: admin@hrms.com / admin123');
  console.log('Employee credentials: [employee-email] / employee123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
