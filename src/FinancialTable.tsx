'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Trash2 } from 'lucide-react'

type Frequency = 'weekly' | 'monthly' | 'yearly'

interface Expense {
  id: number
  name: string
  account: string
  lastPayment: string
  frequency: Frequency
  amount: number
  nextPayment: string
}

const calculateCosts = (amount: number, frequency: Frequency) => {
  const yearlyAmount = frequency === 'weekly' ? amount * 52 : frequency === 'monthly' ? amount * 12 : amount
  return {
    daily: yearlyAmount / 365,
    weekly: yearlyAmount / 52,
    monthly: yearlyAmount / 12,
    yearly: yearlyAmount
  }
}

const calculateNextPayment = (lastPayment: string, frequency: Frequency): string => {
  const date = new Date(lastPayment)
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
  }
  return formatDate(date)
}

const formatDate = (date: Date): string => {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#A4DE6C', '#D0ED57', '#FFA07A', '#20B2AA']

export default function FinancialApp() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id' | 'nextPayment'>>({
    name: '',
    account: '',
    lastPayment: '',
    frequency: 'monthly',
    amount: 0
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)

  useEffect(() => {
    const savedExpenses = localStorage.getItem('expenses')
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses))
  }, [expenses])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewExpense(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }))
  }

  const handleFrequencyChange = (value: Frequency) => {
    setNewExpense(prev => ({ ...prev, frequency: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextPayment = calculateNextPayment(newExpense.lastPayment, newExpense.frequency)
    setExpenses(prev => [...prev, { ...newExpense, id: Date.now(), nextPayment }])
    setNewExpense({
      name: '',
      account: '',
      lastPayment: '',
      frequency: 'monthly',
      amount: 0
    })
  }

  const handleDelete = (id: number) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id))
  }

  const handleEdit = (id: number, field: string) => {
    setEditingId(id)
    setEditingField(field)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setExpenses(prev => prev.map(expense => {
      if (expense.id === editingId) {
        const updatedExpense = {
          ...expense,
          [editingField as keyof Expense]: editingField === 'amount' ? parseFloat(value) || 0 : value
        }
        if (editingField === 'lastPayment' || editingField === 'frequency') {
          updatedExpense.nextPayment = calculateNextPayment(
            editingField === 'lastPayment' ? value : expense.lastPayment,
            editingField === 'frequency' ? value as Frequency : expense.frequency
          )
        }
        return updatedExpense
      }
      return expense
    }))
  }

  const handleEditSelect = (value: Frequency) => {
    setExpenses(prev => prev.map(expense => {
      if (expense.id === editingId) {
        const updatedExpense = { ...expense, frequency: value }
        updatedExpense.nextPayment = calculateNextPayment(expense.lastPayment, value)
        return updatedExpense
      }
      return expense
    }))
  }

  const handleEditBlur = () => {
    setEditingId(null)
    setEditingField(null)
  }

  const totalCosts = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const costs = calculateCosts(expense.amount, expense.frequency)
      return {
        daily: acc.daily + costs.daily,
        weekly: acc.weekly + costs.weekly,
        monthly: acc.monthly + costs.monthly,
        yearly: acc.yearly + costs.yearly
      }
    }, { daily: 0, weekly: 0, monthly: 0, yearly: 0 })
  }, [expenses])

  const chartData = useMemo(() => {
    return expenses.map(expense => {
      const costs = calculateCosts(expense.amount, expense.frequency)
      return {
        name: expense.name,
        value: costs.yearly
      }
    })
  }, [expenses])

  const lineChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let accumulatedCosts: { [key: string]: number } = {};

    return months.map((month) => {
      const monthData: { [key: string]: number } = { [month]: 0 };
      let totalForMonth = 0;

      expenses.forEach(expense => {
        const monthlyCost = calculateCosts(expense.amount, expense.frequency).monthly;
        accumulatedCosts[expense.name] = (accumulatedCosts[expense.name] || 0) + monthlyCost;
        monthData[expense.name] = accumulatedCosts[expense.name];
        totalForMonth += monthlyCost;
      });

      monthData['Total'] = Object.values(accumulatedCosts).reduce((sum, cost) => sum + cost, 0);

      return monthData;
    });
  }, [expenses]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Financial Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Daily Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCosts.daily.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCosts.weekly.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCosts.monthly.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Yearly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCosts.yearly.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-grow min-w-[200px]">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
            <Input
              id="name"
              name="name"
              value={newExpense.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="flex-grow min-w-[200px]">
            <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <Input
              id="account"
              name="account"
              value={newExpense.account}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="flex-grow min-w-[200px]">
            <label htmlFor="lastPayment" className="block text-sm font-medium text-gray-700 mb-1">Last Payment (DD/MM/YYYY)</label>
            <Input
              id="lastPayment"
              name="lastPayment"
              type="date"
              value={newExpense.lastPayment}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="flex-grow min-w-[200px]">
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <Select value={newExpense.frequency} onValueChange={handleFrequencyChange}>
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow min-w-[200px]">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <Input
              id="amount"
              name="amount"
              type="number"
              value={newExpense.amount || ''}
              onChange={handleInputChange}
              required
            />
          </div>
          <Button type="submit" className="ml-auto">Add Expense</Button>
        </div>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Last Payment</TableHead>
            <TableHead>Next Payment</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Daily Cost</TableHead>
            <TableHead>Weekly Cost</TableHead>
            <TableHead>Monthly Cost</TableHead>
            <TableHead>Yearly Cost</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map(expense => {
            const costs = calculateCosts(expense.amount, expense.frequency)
            return (
              <TableRow key={expense.id}>
                <TableCell onDoubleClick={() => handleEdit(expense.id, 'name')}>
                  {editingId === expense.id && editingField === 'name' ? (
                    <Input
                      value={expense.name}
                      onChange={handleEditChange}
                      onBlur={handleEditBlur}
                      autoFocus
                    />
                  ) : (
                    expense.name
                  )}
                </TableCell>
                <TableCell onDoubleClick={() => handleEdit(expense.id, 'account')}>
                  {editingId === expense.id && editingField === 'account' ? (
                    <Input
                      value={expense.account}
                      onChange={handleEditChange}
                      onBlur={handleEditBlur}
                      autoFocus
                    />
                  ) : (
                    expense.account
                  )}
                </TableCell>
                <TableCell onDoubleClick={() => handleEdit(expense.id, 'lastPayment')}>
                  {editingId === expense.id && editingField === 'lastPayment' ? (
                    <Input
                      value={expense.lastPayment}
                      onChange={handleEditChange}
                      onBlur={handleEditBlur}
                      autoFocus
                      type="date"
                    />
                  ) : (
                    formatDate(new Date(expense.lastPayment))
                  )}
                </TableCell>
                <TableCell>{expense.nextPayment}</TableCell>
                <TableCell onDoubleClick={() => handleEdit(expense.id, 'frequency')}>
                  {editingId === expense.id && editingField === 'frequency' ? (
                    <Select
                      value={expense.frequency}
                      onValueChange={(value: string) => {
                        handleEditSelect(value as Frequency);
                        handleEditBlur();
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    expense.frequency
                  )}
                </TableCell>
                <TableCell onDoubleClick={() => handleEdit(expense.id, 'amount')}>
                  {editingId === expense.id && editingField === 'amount' ? (
                    <Input
                      value={expense.amount}
                      onChange={handleEditChange}
                      onBlur={handleEditBlur}
                      autoFocus
                      type="number"
                    />
                  ) : (
                    `$${expense.amount.toFixed(2)}`
                  )}
                </TableCell>
                <TableCell>${costs.daily.toFixed(2)}</TableCell>
                <TableCell>${costs.weekly.toFixed(2)}</TableCell>
                <TableCell>${costs.monthly.toFixed(2)}</TableCell>
                <TableCell>${costs.yearly.toFixed(2)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(expense.id)}
                    aria-label={`Delete ${expense.name} expense`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="mt-8 grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Expense Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accumulated Cost Over Year</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                ...Object.fromEntries(expenses.map((expense, index) => [
                  expense.name,
                  { label: expense.name, color: `hsl(var(--chart-${(index % 10) + 1}))` }
                ])),
                Total: { label: 'Total', color: 'hsl(var(--chart-0))' }
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  {expenses.map((expense) => (
                    <Line
                      key={expense.id}
                      type="monotone"
                      dataKey={expense.name}
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="Total"
                    stroke="#82ca9d"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

