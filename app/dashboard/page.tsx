"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db, calculateMiscellaneousTotal, type Child, type Adult, type Household } from "@/lib/db"
import { formatCurrency } from "@/lib/config"
import { PageHeader } from "@/components/page-header"
import { useReloadOnSync } from "@/hooks/use-reload-on-sync"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { TrendingUp, DollarSign, Users, Home, User, AlertCircle } from "lucide-react"

interface CategoryData {
  name: string
  value: number
  color: string
}

interface EntityExpenseData {
  id: number
  name: string
  total: number
  categories: CategoryData[]
}

interface StackedBarData {
  category: string
  [key: string]: string | number
}

const COLORS = [
  "hsl(180, 27%, 49%)", // primary - teal
  "hsl(340, 75%, 65%)", // secondary
  "hsl(200, 70%, 60%)", // accent
  "hsl(150, 60%, 50%)", // success
  "hsl(40, 90%, 60%)", // warning
  "hsl(180, 27%, 62%)", // teal light
  "hsl(340, 60%, 75%)",
  "hsl(280, 65%, 60%)",
  "hsl(20, 80%, 55%)",
  "hsl(100, 50%, 45%)",
]

const ENTITY_COLORS = {
  children: "hsl(200, 70%, 60%)",
  adults: "hsl(340, 75%, 65%)",
  household: "hsl(180, 27%, 49%)",
}

export default function DashboardPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [adults, setAdults] = useState<Adult[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  
  const [childrenExpenseData, setChildrenExpenseData] = useState<EntityExpenseData[]>([])
  const [adultsExpenseData, setAdultsExpenseData] = useState<EntityExpenseData[]>([])
  const [householdsExpenseData, setHouseholdsExpenseData] = useState<EntityExpenseData[]>([])
  
  const [selectedChildId, setSelectedChildId] = useState<string>("")
  const [selectedAdultId, setSelectedAdultId] = useState<string>("")
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>("")
  
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])
  useReloadOnSync(loadData)

  async function loadData() {
    setLoading(true)
    
    // Load all entities
    const allChildren = await db.children.toArray()
    const allAdults = await db.adults.toArray()
    const allHouseholds = await db.households.toArray()
    
    setChildren(allChildren)
    setAdults(allAdults)
    setHouseholds(allHouseholds)

    // Set default selections
    if (allChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(allChildren[0].id!.toString())
    }
    if (allAdults.length > 0 && !selectedAdultId) {
      setSelectedAdultId(allAdults[0].id!.toString())
    }
    if (allHouseholds.length > 0 && !selectedHouseholdId) {
      setSelectedHouseholdId(allHouseholds[0].id!.toString())
    }

    // Load children expense data
    const childExpenseData: EntityExpenseData[] = []
    for (const child of allChildren) {
      const categories = await db.categories.where("childId").equals(child.id!).sortBy("order")
      const categoryData: CategoryData[] = []
      let childTotal = 0

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i]
        const items = await db.items.where("categoryId").equals(category.id!).toArray()
        let categoryTotal = items.reduce((sum, item) => sum + item.total, 0)

        if (category.isPercentageBased && category.percentageValue) {
          let otherTotal = 0
          for (const cat of categories) {
            if (cat.id !== category.id && cat.id) {
              const catItems = await db.items.where("categoryId").equals(cat.id).toArray()
              otherTotal += catItems.reduce((sum, item) => sum + item.total, 0)
            }
          }
          categoryTotal = calculateMiscellaneousTotal(category.percentageValue, otherTotal)
        }

        if (categoryTotal > 0) {
          categoryData.push({
            name: category.name,
            value: categoryTotal,
            color: COLORS[i % COLORS.length],
          })
          childTotal += categoryTotal
        }
      }

      childExpenseData.push({
        id: child.id!,
        name: child.name,
        total: childTotal,
        categories: categoryData,
      })
    }
    setChildrenExpenseData(childExpenseData)

    // Load adults expense data
    const adultExpenseData: EntityExpenseData[] = []
    for (const adult of allAdults) {
      const categories = await db.adultCategories.where("adultId").equals(adult.id!).sortBy("order")
      const categoryData: CategoryData[] = []
      let adultTotal = 0

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i]
        const items = await db.adultItems.where("categoryId").equals(category.id!).toArray()
        let categoryTotal = items.reduce((sum, item) => sum + item.total, 0)

        if (category.isPercentageBased && category.percentageValue) {
          let otherTotal = 0
          for (const cat of categories) {
            if (cat.id !== category.id && cat.id) {
              const catItems = await db.adultItems.where("categoryId").equals(cat.id).toArray()
              otherTotal += catItems.reduce((sum, item) => sum + item.total, 0)
            }
          }
          categoryTotal = calculateMiscellaneousTotal(category.percentageValue, otherTotal)
        }

        if (categoryTotal > 0) {
          categoryData.push({
            name: category.name,
            value: categoryTotal,
            color: COLORS[i % COLORS.length],
          })
          adultTotal += categoryTotal
        }
      }

      adultExpenseData.push({
        id: adult.id!,
        name: adult.name,
        total: adultTotal,
        categories: categoryData,
      })
    }
    setAdultsExpenseData(adultExpenseData)

    // Load households expense data
    const householdExpenseData: EntityExpenseData[] = []
    for (const household of allHouseholds) {
      const categories = await db.householdCategories.where("householdId").equals(household.id!).sortBy("order")
      const categoryData: CategoryData[] = []
      let householdTotal = 0

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i]
        const items = await db.householdItems.where("categoryId").equals(category.id!).toArray()
        let categoryTotal = items.reduce((sum, item) => sum + item.total, 0)

        if (category.isPercentageBased && category.percentageValue) {
          let otherTotal = 0
          for (const cat of categories) {
            if (cat.id !== category.id && cat.id) {
              const catItems = await db.householdItems.where("categoryId").equals(cat.id).toArray()
              otherTotal += catItems.reduce((sum, item) => sum + item.total, 0)
            }
          }
          categoryTotal = calculateMiscellaneousTotal(category.percentageValue, otherTotal)
        }

        if (categoryTotal > 0) {
          categoryData.push({
            name: category.name,
            value: categoryTotal,
            color: COLORS[i % COLORS.length],
          })
          householdTotal += categoryTotal
        }
      }

      householdExpenseData.push({
        id: household.id!,
        name: household.name,
        total: householdTotal,
        categories: categoryData,
      })
    }
    setHouseholdsExpenseData(householdExpenseData)

    setLoading(false)
  }

  // Calculate totals
  const totalChildren = childrenExpenseData.reduce((sum, data) => sum + data.total, 0)
  const totalAdults = adultsExpenseData.reduce((sum, data) => sum + data.total, 0)
  const totalHousehold = householdsExpenseData.reduce((sum, data) => sum + data.total, 0)
  const grandTotal = totalChildren + totalAdults + totalHousehold

  // Overview pie chart data
  const overviewData = [
    { name: "Children", value: totalChildren, color: ENTITY_COLORS.children },
    { name: "Adults", value: totalAdults, color: ENTITY_COLORS.adults },
    { name: "Household", value: totalHousehold, color: ENTITY_COLORS.household },
  ].filter(item => item.value > 0)

  // Generate stacked bar data for children
  const childrenStackedData = (): StackedBarData[] => {
    const allCategories = new Set<string>()
    childrenExpenseData.forEach(child => {
      child.categories.forEach(cat => allCategories.add(cat.name))
    })
    
    return Array.from(allCategories).map(category => {
      const dataPoint: StackedBarData = { category }
      childrenExpenseData.forEach(child => {
        const cat = child.categories.find(c => c.name === category)
        dataPoint[child.name] = cat ? cat.value : 0
      })
      return dataPoint
    })
  }

  // Generate stacked bar data for adults
  const adultsStackedData = (): StackedBarData[] => {
    const allCategories = new Set<string>()
    adultsExpenseData.forEach(adult => {
      adult.categories.forEach(cat => allCategories.add(cat.name))
    })
    
    return Array.from(allCategories).map(category => {
      const dataPoint: StackedBarData = { category }
      adultsExpenseData.forEach(adult => {
        const cat = adult.categories.find(c => c.name === category)
        dataPoint[adult.name] = cat ? cat.value : 0
      })
      return dataPoint
    })
  }

  // Selected entity data for drill-down
  const selectedChildData = childrenExpenseData.find((data) => data.id.toString() === selectedChildId)
  const selectedAdultData = adultsExpenseData.find((data) => data.id.toString() === selectedAdultId)
  const selectedHouseholdData = householdsExpenseData.find((data) => data.id.toString() === selectedHouseholdId)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  const hasAnyData = children.length > 0 || adults.length > 0 || households.length > 0

  if (!hasAnyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <PageHeader />
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <AlertCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No Data Available</h3>
              <p className="text-muted-foreground">Add a household, adult, or child to see dashboard visualizations</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader />

        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-3 font-serif text-xl font-bold text-foreground">Budget Dashboard</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Dashboard gives you a visual overview of your family&apos;s finances across household, adults, and children. At a glance, you can see where most of your spending is going and how each area contributes to your overall costs.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Annual</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(grandTotal / 12)} per month</p>
            </CardContent>
          </Card>

          <Card className="border-[hsl(200,70%,60%)]/20 bg-gradient-to-br from-[hsl(200,70%,60%)]/10 to-[hsl(200,70%,60%)]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Children</CardTitle>
              <Users className="h-4 w-4" style={{ color: ENTITY_COLORS.children }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: ENTITY_COLORS.children }}>{formatCurrency(totalChildren)}</div>
              <p className="text-xs text-muted-foreground">{children.length} child{children.length !== 1 ? "ren" : ""}</p>
            </CardContent>
          </Card>

          <Card className="border-[hsl(340,75%,65%)]/20 bg-gradient-to-br from-[hsl(340,75%,65%)]/10 to-[hsl(340,75%,65%)]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Adults</CardTitle>
              <User className="h-4 w-4" style={{ color: ENTITY_COLORS.adults }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: ENTITY_COLORS.adults }}>{formatCurrency(totalAdults)}</div>
              <p className="text-xs text-muted-foreground">{adults.length} adult{adults.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Household</CardTitle>
              <Home className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalHousehold)}</div>
              <p className="text-xs text-muted-foreground">{households.length} household{households.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
        </div>

        {/* Overview Section */}
        {overviewData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Family Spending Overview</CardTitle>
              <CardDescription>Total annual spend across all categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="w-full lg:w-1/2">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={overviewData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {overviewData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/2 space-y-4">
                  {overviewData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.value)}</p>
                        <p className="text-xs text-muted-foreground">{((item.value / grandTotal) * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stacked Bar Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Children Stacked Bar Chart */}
          {childrenExpenseData.length > 0 && childrenExpenseData.some(c => c.total > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: ENTITY_COLORS.children }} />
                  Children by Category
                </CardTitle>
                <CardDescription>Category breakdown across all children</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={childrenStackedData()} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={100}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      width={60}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    {childrenExpenseData.map((child, index) => (
                      <Bar
                        key={child.id}
                        dataKey={child.name}
                        stackId="a"
                        fill={COLORS[index % COLORS.length]}
                        radius={index === childrenExpenseData.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Adults Stacked Bar Chart */}
          {adultsExpenseData.length > 0 && adultsExpenseData.some(a => a.total > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" style={{ color: ENTITY_COLORS.adults }} />
                  Adults by Category
                </CardTitle>
                <CardDescription>Category breakdown across all adults</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={adultsStackedData()} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={100}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      width={60}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    {adultsExpenseData.map((adult, index) => (
                      <Bar
                        key={adult.id}
                        dataKey={adult.name}
                        stackId="a"
                        fill={COLORS[(index + 3) % COLORS.length]}
                        radius={index === adultsExpenseData.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Household Category Breakdown */}
        {householdsExpenseData.length > 0 && householdsExpenseData.some(h => h.total > 0) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Household Category Breakdown
              </CardTitle>
              <CardDescription>Annual costs by household category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={householdsExpenseData.flatMap(h => h.categories)} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={100}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {householdsExpenseData.flatMap(h => h.categories).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Drill-Down Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Detailed Breakdown
            </CardTitle>
            <CardDescription>Select an individual to view their category breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="children" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="children" className="gap-2">
                  <Users className="h-4 w-4" />
                  Children
                </TabsTrigger>
                <TabsTrigger value="adults" className="gap-2">
                  <User className="h-4 w-4" />
                  Adults
                </TabsTrigger>
                <TabsTrigger value="household" className="gap-2">
                  <Home className="h-4 w-4" />
                  Household
                </TabsTrigger>
              </TabsList>

              {/* Children Tab */}
              <TabsContent value="children">
                {children.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium">Select Child:</Label>
                      <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {children.map((child) => (
                            <SelectItem key={child.id} value={child.id!.toString()}>
                              {child.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedChildData && selectedChildData.categories.length > 0 ? (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                          <h4 className="font-medium mb-4">{selectedChildData.name}&apos;s Expense Breakdown</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={selectedChildData.categories}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                innerRadius={30}
                                fill="#8884d8"
                                dataKey="value"
                                paddingAngle={1}
                              >
                                {selectedChildData.categories.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "var(--radius)",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium mb-4">Category Details</h4>
                          {selectedChildData.categories.map((cat, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm">{cat.name}</span>
                              </div>
                              <span className="font-medium text-sm">{formatCurrency(cat.value)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between p-2 rounded bg-primary/10 mt-4">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold text-primary">{formatCurrency(selectedChildData.total)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No expense data for {selectedChildData?.name || "this child"}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No children added yet
                  </div>
                )}
              </TabsContent>

              {/* Adults Tab */}
              <TabsContent value="adults">
                {adults.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium">Select Adult:</Label>
                      <Select value={selectedAdultId} onValueChange={setSelectedAdultId}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {adults.map((adult) => (
                            <SelectItem key={adult.id} value={adult.id!.toString()}>
                              {adult.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedAdultData && selectedAdultData.categories.length > 0 ? (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                          <h4 className="font-medium mb-4">{selectedAdultData.name}&apos;s Expense Breakdown</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={selectedAdultData.categories}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                innerRadius={30}
                                fill="#8884d8"
                                dataKey="value"
                                paddingAngle={1}
                              >
                                {selectedAdultData.categories.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "var(--radius)",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium mb-4">Category Details</h4>
                          {selectedAdultData.categories.map((cat, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm">{cat.name}</span>
                              </div>
                              <span className="font-medium text-sm">{formatCurrency(cat.value)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between p-2 rounded bg-primary/10 mt-4">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold text-primary">{formatCurrency(selectedAdultData.total)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No expense data for {selectedAdultData?.name || "this adult"}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No adults added yet
                  </div>
                )}
              </TabsContent>

              {/* Household Tab */}
              <TabsContent value="household">
                {households.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium">Select Household:</Label>
                      <Select value={selectedHouseholdId} onValueChange={setSelectedHouseholdId}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {households.map((household) => (
                            <SelectItem key={household.id} value={household.id!.toString()}>
                              {household.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedHouseholdData && selectedHouseholdData.categories.length > 0 ? (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                          <h4 className="font-medium mb-4">{selectedHouseholdData.name} Expense Breakdown</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={selectedHouseholdData.categories}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                innerRadius={30}
                                fill="#8884d8"
                                dataKey="value"
                                paddingAngle={1}
                              >
                                {selectedHouseholdData.categories.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "var(--radius)",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium mb-4">Category Details</h4>
                          {selectedHouseholdData.categories.map((cat, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm">{cat.name}</span>
                              </div>
                              <span className="font-medium text-sm">{formatCurrency(cat.value)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between p-2 rounded bg-primary/10 mt-4">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold text-primary">{formatCurrency(selectedHouseholdData.total)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No expense data for {selectedHouseholdData?.name || "this household"}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No households added yet
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}
