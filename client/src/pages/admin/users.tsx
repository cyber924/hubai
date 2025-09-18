import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminSidebar from "@/components/admin-sidebar";
import { queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Search, 
  Filter,
  Crown,
  Shield,
  UserCheck,
  UserX,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  username: string;
  email: string;
  subscriptionPlan: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: userStats, isLoading: statsLoading } = useQuery<{total: number; premium: number; free: number; admin: number}>({
    queryKey: ['/api/stats/users'],
    refetchInterval: 30000,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/users'] });
    },
  });

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "admin" && user.isAdmin) ||
      (statusFilter === "premium" && user.subscriptionPlan && user.subscriptionPlan !== "free") ||
      (statusFilter === "free" && (!user.subscriptionPlan || user.subscriptionPlan === "free"));
    
    return matchesSearch && matchesStatus;
  });

  const handleToggleAdmin = (userId: string, isAdmin: boolean) => {
    updateUserMutation.mutate({ 
      userId, 
      updates: { isAdmin: !isAdmin } 
    });
  };

  const handleUpdateSubscription = (userId: string, plan: string) => {
    updateUserMutation.mutate({ 
      userId, 
      updates: { subscriptionPlan: plan } 
    });
  };

  const getSubscriptionBadge = (plan: string | null) => {
    if (!plan || plan === "free") {
      return <Badge variant="secondary" className="korean-text">무료</Badge>;
    }
    return <Badge variant="default" className="korean-text">프리미엄</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex">
        <AdminSidebar className="fixed left-0 top-0 h-screen" />
        
        <div className="flex-1 ml-64 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-500/10 text-blue-600 korean-text mb-4">
              <Users className="mr-2 h-4 w-4" />
              사용자 관리
            </div>
            <h1 className="text-3xl font-bold korean-text" data-testid="text-users-title">사용자 관리</h1>
            <p className="text-muted-foreground korean-text">
              회원 정보 관리, 구독 상태 및 권한 설정
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">총 회원수</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-total-users">
                      {statsLoading ? "..." : userStats?.total || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">프리미엄</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-premium-users">
                      {statsLoading ? "..." : userStats?.premium || 0}
                    </p>
                  </div>
                  <Crown className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">무료 회원</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-free-users">
                      {statsLoading ? "..." : userStats?.free || 0}
                    </p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">관리자</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-admin-users">
                      {statsLoading ? "..." : userStats?.admin || 0}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="korean-text">필터 및 검색</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="사용자명 또는 이메일 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 korean-text"
                      data-testid="input-search-users"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="admin">관리자</SelectItem>
                      <SelectItem value="premium">프리미엄</SelectItem>
                      <SelectItem value="free">무료 회원</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="korean-text">사용자 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                      <div className="w-10 h-10 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="korean-text">사용자</TableHead>
                      <TableHead className="korean-text">이메일</TableHead>
                      <TableHead className="korean-text">구독 상태</TableHead>
                      <TableHead className="korean-text">권한</TableHead>
                      <TableHead className="korean-text">가입일</TableHead>
                      <TableHead className="korean-text">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium korean-text" data-testid={`text-username-${user.id}`}>
                              {user.username}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="english-text" data-testid={`text-email-${user.id}`}>
                          {user.email}
                        </TableCell>
                        <TableCell>
                          {getSubscriptionBadge(user.subscriptionPlan)}
                        </TableCell>
                        <TableCell>
                          {user.isAdmin ? (
                            <Badge variant="destructive" className="korean-text">
                              <Shield className="mr-1 h-3 w-3" />
                              관리자
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="korean-text">일반 사용자</Badge>
                          )}
                        </TableCell>
                        <TableCell className="korean-text">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-actions-${user.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="korean-text">사용자 작업</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                                className="korean-text"
                                data-testid={`action-toggle-admin-${user.id}`}
                              >
                                {user.isAdmin ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    관리자 해제
                                  </>
                                ) : (
                                  <>
                                    <Shield className="mr-2 h-4 w-4" />
                                    관리자 승격
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateSubscription(user.id, user.subscriptionPlan === "free" || !user.subscriptionPlan ? "premium" : "free")}
                                className="korean-text"
                                data-testid={`action-toggle-subscription-${user.id}`}
                              >
                                {(!user.subscriptionPlan || user.subscriptionPlan === "free") ? (
                                  <>
                                    <Crown className="mr-2 h-4 w-4" />
                                    프리미엄 업그레이드
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    무료 계정으로 변경
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold korean-text mb-2">
                    {searchTerm || statusFilter !== "all" ? "검색 결과가 없습니다" : "등록된 사용자가 없습니다"}
                  </h3>
                  <p className="text-muted-foreground korean-text">
                    {searchTerm || statusFilter !== "all" 
                      ? "다른 검색어나 필터를 시도해보세요." 
                      : "첫 번째 사용자가 가입할 때까지 기다려주세요."
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}