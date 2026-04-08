package com.culcom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CulcomApplication {
    public static void main(String[] args) {
        SpringApplication.run(CulcomApplication.class, args);
    }
}