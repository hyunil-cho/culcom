# ─── Route53 Hosted Zone (수동 생성 후 ID를 변수로 전달) ───
data "aws_route53_zone" "main" {
  zone_id = var.route53_zone_id
}

# ─── A 레코드: 서비스 도메인 → ALB ───
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
