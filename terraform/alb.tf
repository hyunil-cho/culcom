# ─── Application Load Balancer ───
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "${var.project_name}-alb" }
}

# ─── HTTP 리스너 (HTTPS 리다이렉트 또는 기본 포워딩) ───
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ─── /api/* → Backend 타겟그룹 ───
resource "aws_lb_listener_rule" "backend_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# ─── /swagger-ui* → Backend ───
resource "aws_lb_listener_rule" "backend_swagger" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 110

  condition {
    path_pattern {
      values = ["/swagger-ui*", "/v3/api-docs*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# ─── Backend 타겟그룹 ───
resource "aws_lb_target_group" "backend" {
  name        = "${var.project_name}-backend"
  port        = 8081
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = { Name = "${var.project_name}-backend-tg" }
}

# ─── Frontend 타겟그룹 ───
resource "aws_lb_target_group" "frontend" {
  name        = "${var.project_name}-frontend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = { Name = "${var.project_name}-frontend-tg" }
}
